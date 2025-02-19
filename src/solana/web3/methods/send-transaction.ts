import { handleUnknownError } from "$/utils/handle-unknown-error";
import type { SendOptions, VersionedTransaction } from "@solana/web3.js";
import { type ResultAsync, fromPromise } from "neverthrow";
import { connection } from "../connection";

export const sendTransaction = (
	transaction: VersionedTransaction,
	options?: SendOptions,
): ResultAsync<string, Error> => {
	return fromPromise(
		connection.sendTransaction(transaction, options),
		(error) => new Error("Failed to send raw transaction", { cause: handleUnknownError(error) }),
	);
};
