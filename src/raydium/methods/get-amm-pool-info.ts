import { handleUnknownError } from "$/utils/handle-unknown-error";
import type { ApiV3PoolInfoStandardItem } from "@raydium-io/raydium-sdk-v2";
import type { PublicKey } from "@solana/web3.js";
import { type ResultAsync, fromPromise } from "neverthrow";
import { raydium } from "../client";

/**
 * @description Gets the pool info for a given mint
 * @param mintPubkey Mint pubkey
 * @returns ResultAsync<ApiV3PoolInfoStandardItem, Error>
 */
export const getAmmPoolInfoByMint = (mintPubkey: PublicKey): ResultAsync<ApiV3PoolInfoStandardItem, Error> => {
	return fromPromise(
		raydium.api.fetchPoolByMints({
			mint1: mintPubkey,
		}),
		(error) => new Error("Failed to get pool info by mint", { cause: handleUnknownError(error) }),
	).map((data) => data.data[0] as ApiV3PoolInfoStandardItem);
};
