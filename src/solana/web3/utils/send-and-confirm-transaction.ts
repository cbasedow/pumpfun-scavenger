import type { SendOptions, VersionedTransaction } from "@solana/web3.js";
import { type ResultAsync, errAsync, okAsync } from "neverthrow";
import { confirmTransaction } from "../methods/confirm-transaction";
import { sendTransaction } from "../methods/send-transaction";

type SendAndConfirmTransactionParams = {
	transaction: VersionedTransaction;
	sendOptions?: SendOptions;
	latestBlockhash: string;
	lastValidBlockHeight: number;
};

export const sendAndConfirmTransaction = (params: SendAndConfirmTransactionParams): ResultAsync<string, Error> => {
	const { transaction, sendOptions, latestBlockhash, lastValidBlockHeight } = params;

	return sendTransaction(transaction, sendOptions).andThen((txnSignature) => {
		return confirmTransaction(
			{
				blockhash: latestBlockhash,
				lastValidBlockHeight,
				signature: txnSignature,
			},
			"confirmed",
		).andThen((confirmationResult) => {
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
