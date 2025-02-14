import { handleUnknownError } from "$/utils/handle-unknown-error";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { type Result, fromThrowable } from "neverthrow";

/**
 * @description Gets the associated token account's pubkey for a given mint and owner pubkey
 * @param mintPubkey Mint pubkey
 * @param ownerPubkey Owner pubkey
 * @returns Result<PublicKey, Error>
 */
export const getAssociatedTokenPubkey = (mintPubkey: PublicKey, ownerPubkey: PublicKey): Result<PublicKey, Error> => {
	return fromThrowable(
		() => {
			return getAssociatedTokenAddressSync(mintPubkey, ownerPubkey);
		},
		(error) => new Error("Failed to get associated token pubkey", { cause: handleUnknownError(error) }),
	)();
};
