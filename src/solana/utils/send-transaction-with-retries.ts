import { helius } from "$/solana/helius";
import { WALLET_PUBKEY } from "$/solana/wallet";
import { bs58Encode } from "$/utils/bs58";
import { logger } from "$/utils/logger";
import {
	ComputeBudgetProgram,
	type Signer,
	type TransactionInstruction,
	TransactionMessage,
	VersionedTransaction,
} from "@solana/web3.js";
import { type HeliusSendOptions, PriorityLevel } from "helius-sdk";
import { type ResultAsync, errAsync, fromSafePromise } from "neverthrow";
import { sendAndConfirmTransaction } from "./send-and-confirm-transaction";

const MAX_RETRIES = 3 as const;
const RETRY_DELAY_MS = 1000 as const;
const DEFAULT_PRIORITY_FEE_ESTIMATE = 50000 as const;
const COMPUTE_UNIT_LIMIT = 100_000 as const;

type SendTransactionWithRetriesParams = {
	instructions: TransactionInstruction[];
	signers: Signer[];
	sendOptions?: HeliusSendOptions;
};

const attemptSendTransaction = (params: SendTransactionWithRetriesParams, attempt = 1): ResultAsync<string, Error> => {
	const { instructions, signers, sendOptions } = params;

	if (signers.length === 0) {
		return errAsync(new Error("No signers provided"));
	}

	return helius.getLatestBlockhash().andThen(({ blockhash, lastValidBlockHeight }) => {
		const initialMessageV0 = new TransactionMessage({
			payerKey: WALLET_PUBKEY,
			recentBlockhash: blockhash,
			instructions,
		}).compileToV0Message();

		const initialTransaction = new VersionedTransaction(initialMessageV0);
		initialTransaction.sign(signers);

		return bs58Encode(initialTransaction.serialize()).asyncAndThen((encodedTransactionStr) => {
			return helius
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
						sendOptions,
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
							attemptSendTransaction(params, attempt + 1),
						);
					});
				});
		});
	});
};

export const sendTransactionWithRetries = (params: SendTransactionWithRetriesParams): ResultAsync<string, Error> => {
	return attemptSendTransaction(params);
};
