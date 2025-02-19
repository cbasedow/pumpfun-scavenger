import { handleUnknownError } from "$/utils/handle-unknown-error";
import type {
	Commitment,
	RpcResponseAndContext,
	SignatureResult,
	TransactionConfirmationStrategy,
} from "@solana/web3.js";
import { type ResultAsync, fromPromise } from "neverthrow";
import { connection } from "../connection";

export const confirmTransaction = (
	strategy: TransactionConfirmationStrategy,
	commitment?: Commitment,
): ResultAsync<RpcResponseAndContext<SignatureResult>, Error> => {
	return fromPromise(
		connection.confirmTransaction(strategy, commitment),
		(error) => new Error("Failed to confirm transaction", { cause: handleUnknownError(error) }),
	);
};
