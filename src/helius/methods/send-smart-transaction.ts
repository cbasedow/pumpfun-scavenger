import { handleUnknownError } from "$/utils/handle-unknown-error";
import type { AddressLookupTableAccount, Signer, TransactionInstruction } from "@solana/web3.js";
import type { SmartTransactionOptions } from "helius-sdk";
import { type ResultAsync, fromPromise } from "neverthrow";
import { helius } from "../client";

type SendSmartTransactionParams = {
	instructions: TransactionInstruction[];
	signers: Signer[];
	lookupTables?: AddressLookupTableAccount[];
	sendOptions?: SmartTransactionOptions;
};

/**
 * Sends a smart transaction
 * @param params.instructions Transaction instructions
 * @param params.signers Signers
 * @param params.lookupTables Address lookup tables
 * @param params.sendOptions Send options
 * @returns ResultAsync<string (transaction signature), Error>
 */
export const sendSmartTransaction = (params: SendSmartTransactionParams): ResultAsync<string, Error> => {
	const { instructions, signers, lookupTables, sendOptions } = params;

	return fromPromise(
		helius.rpc.sendSmartTransaction(instructions, signers, lookupTables, sendOptions),
		(error) => new Error("Failed to send smart transaction", { cause: handleUnknownError(error) }),
	);
};
