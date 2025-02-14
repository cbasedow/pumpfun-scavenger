import { Keypair } from "@solana/web3.js";
import { type Result, fromThrowable } from "neverthrow";
import { handleUnknownError } from "./handle-unknown-error";

/**
 * @description Creates a Keypair from a secret key
 * @param secretKey Secret key
 * @returns Result<Keypair, Error>
 */
export const createKeyPairFromSecretKey = (secretKey: Uint8Array): Result<Keypair, Error> => {
	return fromThrowable(
		() => {
			return Keypair.fromSecretKey(secretKey);
		},
		(error) => new Error("Failed to create Keypair from Secret Key", { cause: handleUnknownError(error) }),
	)();
};
