import { WALLET_PUBKEY } from "$/config/wallet";
import { heliusRpc } from "$/helius";
import { getLatestBlockhash } from "$/solana-rpc/methods/get-latest-blockhash";
import { bs58Encode } from "$/utils/bs58";
import { logger } from "$/utils/logger";
import {
	ComputeBudgetProgram,
	type Signer,
	type TransactionInstruction,
	TransactionMessage,
	VersionedTransaction,
} from "@solana/web3.js";
import { PriorityLevel } from "helius-sdk";
import { type ResultAsync, errAsync, fromSafePromise } from "neverthrow";
import { sendAndConfirmTransaction } from "../utils/send-and-confirm-transaction";

const MAX_RETRIES = 3 as const;
const RETRY_DELAY_MS = 1000 as const;
const DEFAULT_PRIORITY_FEE_ESTIMATE = 50000 as const;
const COMPUTE_UNIT_LIMIT = 100_000 as const;

const attemptSendTransaction = (
	instructions: TransactionInstruction[],
	signers: Signer[],
	attempt = 1,
): ResultAsync<string, Error> => {
	if (signers.length === 0) {
		return errAsync(new Error("No signers provided"));
	}

	return getLatestBlockhash().andThen(({ blockhash, lastValidBlockHeight }) => {
		const initialMessageV0 = new TransactionMessage({
			payerKey: WALLET_PUBKEY,
			recentBlockhash: blockhash,
			instructions,
		}).compileToV0Message();

		const initialTransaction = new VersionedTransaction(initialMessageV0);
		initialTransaction.sign(signers);

		const serializedInitialTransaction = initialTransaction.serialize();

		return bs58Encode(serializedInitialTransaction).asyncAndThen((encodedTransactionStr) => {
			return heliusRpc
				.getPriorityFeeEstimate({
					transaction: encodedTransactionStr,
					options: {
						// LOW was causing errors, MEDIUM is sweet spot to avoid paying too much
						priorityLevel: PriorityLevel.MEDIUM,
					},
				})
				.andThen(({ priorityFeeEstimate }) => {
					const computeUnitLimitInstruction = ComputeBudgetProgram.setComputeUnitLimit({
						units: COMPUTE_UNIT_LIMIT,
					});

					const computeUnitPriceInstruction = ComputeBudgetProgram.setComputeUnitPrice({
						microLamports: BigInt(priorityFeeEstimate ?? DEFAULT_PRIORITY_FEE_ESTIMATE),
					});

					const finalMessageV0 = new TransactionMessage({
						payerKey: WALLET_PUBKEY,
						recentBlockhash: blockhash,
						instructions: [computeUnitLimitInstruction, computeUnitPriceInstruction, ...instructions],
					}).compileToV0Message();

					const finalTransaction = new VersionedTransaction(finalMessageV0);
					finalTransaction.sign(signers);

					return sendAndConfirmTransaction({
						transaction: finalTransaction,
						sendOptions: {
							skipPreflight: true,
							maxRetries: 0,
							preflightCommitment: "confirmed",
						},
						latestBlockhash: blockhash,
						lastValidBlockHeight,
					}).orElse((error) => {
						if (attempt >= MAX_RETRIES) {
							return errAsync(error);
						}

						logger.warn({
							msg: `Failed to send and confirm transaction, retrying in ${RETRY_DELAY_MS}ms...`,
							attempt,
							error,
						});

						return fromSafePromise(new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))).andThen(() =>
							attemptSendTransaction(instructions, signers, attempt + 1),
						);
					});
				});
		});
	});
};

export const sendTransactionWithRetries = (
	instructions: TransactionInstruction[],
	signers: Signer[],
): ResultAsync<string, Error> => {
	return attemptSendTransaction(instructions, signers);
};
