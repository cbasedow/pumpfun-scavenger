import bs58 from "bs58";
import { type Result, fromThrowable } from "neverthrow";
import { handleUnknownError } from "./handle-unknown-error";

/**
 * Encodes a buffer to base58 string
 * @param buffer Buffer to encode
 * @returns Result<string, Error>
 */
export const bs58Encode = (buffer: Buffer | Uint8Array | number[]): Result<string, Error> => {
	return fromThrowable(
		() => {
			return bs58.encode(buffer);
		},
		(error) => new Error("Failed to encode to base58 string", { cause: handleUnknownError(error) }),
	)();
};

/**
 * Decodes a base58 string to an Uint8Array
 * @param base58String Base58 string to decode
 * @returns Result<Uint8Array, Error>
 */
export const bs58Decode = (base58String: string): Result<Uint8Array, Error> => {
	return fromThrowable(
		() => {
			return bs58.decode(base58String);
		},
		(error) => new Error("Failed to decode base58 string", { cause: handleUnknownError(error) }),
	)();
};
