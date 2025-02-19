import { web3 } from "$/solana/web3";
import { handleUnknownError } from "$/utils/handle-unknown-error";
import { type Account, TokenAccountNotFoundError, getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { type ResultAsync, errAsync, fromPromise, okAsync } from "neverthrow";

/**
 * Gets the token account for a given account pubkey
 * @param accountPubkey Account pubkey
 * @returns ResultAsync<Account | null, Error>
 */
export const getTokenAccount = (accountPubkey: PublicKey): ResultAsync<Account | null, Error> => {
	return fromPromise(getAccount(web3.connection, accountPubkey), (error) => {
		if (error instanceof TokenAccountNotFoundError) {
			return error;
		}
		return new Error("Failed to get token account", { cause: handleUnknownError(error) });
	}).orElse((error) => {
		// Return null instead of Error if the account doesn't exist
		if (error instanceof TokenAccountNotFoundError) {
			return okAsync(null);
		}
		return errAsync(error);
	});
};
