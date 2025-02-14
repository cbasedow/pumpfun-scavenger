import { PublicKey } from "@solana/web3.js";
import { Result, fromThrowable } from "neverthrow";
import { handleUnknownError } from "./handle-unknown-error";

/**
 * Create a PublicKey from a string
 * @param str - The string to create the PublicKey from
 * @returns Result<PublicKey, Error>
 */

export const createPubkey = (str: string): Result<PublicKey, Error> => {
	return fromThrowable(
		() => {
			return new PublicKey(str);
		},
		(error) => new Error("Failed to create Public Key", { cause: handleUnknownError(error) }),
	)();
};

/**
 * Creates an array of PublicKeys from an array of strings
 * @param strs Array of strings
 * @returns Result<PublicKey[], Error>
 */
export const createPubkeys = (strs: string[]): Result<PublicKey[], Error> => {
	return Result.combine(strs.map(createPubkey));
};
