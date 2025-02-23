import { handleUnknownError } from "$/utils/handle-unknown-error";
import type {
	RpcResponseAndContext,
	SimulateTransactionConfig,
	SimulatedTransactionResponse,
	VersionedTransaction,
} from "@solana/web3.js";
import { type ResultAsync, fromPromise } from "neverthrow";
import { connection } from "../connection";

export const simulateVersionedTransaction = (
	versionedTransaction: VersionedTransaction,
	config?: SimulateTransactionConfig,
): ResultAsync<RpcResponseAndContext<SimulatedTransactionResponse>, Error> => {
	return fromPromise(
		connection.simulateTransaction(versionedTransaction, config),
		(error) => new Error("Failed to simulate transaction", { cause: handleUnknownError(error) }),
	);
};
