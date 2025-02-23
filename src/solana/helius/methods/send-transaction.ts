import { handleUnknownError } from "$/utils/handle-unknown-error";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import type { HeliusSendOptions } from "helius-sdk";
import { type ResultAsync, fromPromise } from "neverthrow";
import { rpcClient } from "../client";

/**
 * Sends a transaction to the Solana network using Helius staked connection
 * @param transaction
 * @param options
 * @returns ResultAsync<string, Error>
 */
export const sendTransaction = (
	transaction: Transaction | VersionedTransaction,
	options?: HeliusSendOptions,
): ResultAsync<string, Error> => {
	return fromPromise(
		rpcClient.sendTransaction(transaction, options),
		(error) => new Error("Failed to send transaction", { cause: handleUnknownError(error) }),
	);
};
