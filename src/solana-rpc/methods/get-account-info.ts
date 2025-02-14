import { handleUnknownError } from "$/utils/handle-unknown-error";
import type { AccountInfo, PublicKey } from "@solana/web3.js";
import { type ResultAsync, fromPromise } from "neverthrow";
import { connection } from "../connection";

/**
 * Gets the account info for a given account pubkey
 * @param accountPubkey Account pubkey
 * @returns ResultAsync<AccountInfo<Buffer> | null, Error>
 */
export const getAccountInfo = (accountPubkey: PublicKey): ResultAsync<AccountInfo<Buffer> | null, Error> => {
	return fromPromise(
		connection.getAccountInfo(accountPubkey),
		(error) => new Error("Failed to get account info", { cause: handleUnknownError(error) }),
	);
};
