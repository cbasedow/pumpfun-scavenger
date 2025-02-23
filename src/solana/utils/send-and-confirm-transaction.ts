import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import type { HeliusSendOptions } from "helius-sdk";
import { type ResultAsync, errAsync, okAsync } from "neverthrow";
import { helius } from "../helius";
import { web3 } from "../web3";

type SendAndConfirmTransactionParams = {
	transaction: Transaction | VersionedTransaction;
	sendOptions?: HeliusSendOptions;
	latestBlockhash: string;
	lastValidBlockHeight: number;
};

/**
 * Sends and confirms a transaction sent to the Solana network using a Helius staked connection
 * @param params.transaction
 * @param params.sendOptions
 * @param params.latestBlockhash
 * @param params.lastValidBlockHeight
 * @returns ResultAsync<string, Error>
 */
export const sendAndConfirmTransaction = (params: SendAndConfirmTransactionParams): ResultAsync<string, Error> => {
	const { transaction, sendOptions, latestBlockhash, lastValidBlockHeight } = params;

	return helius.sendTransaction(transaction, sendOptions).andThen((txnSignature) => {
		return web3
			.confirmTransaction(
				{
					blockhash: latestBlockhash,
					lastValidBlockHeight,
					signature: txnSignature,
				},
				"confirmed",
			)
			.andThen((confirmationResult) => {
				const transactionError = confirmationResult.value.err;

				if (transactionError === null) {
					return okAsync(txnSignature);
				}

				if (typeof transactionError === "string") {
					return errAsync(new Error(`Failed to confirm transaction: ${transactionError}`));
				}

				if (typeof transactionError === "object" && Object.keys(transactionError).length > 0) {
					return errAsync(new Error(`Failed to confirm transaction: ${JSON.stringify(transactionError)}`));
				}

				return errAsync(new Error("Failed to confirm transaction: Unknown error"));
			});
	});
};
