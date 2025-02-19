import { handleUnknownError } from "$/utils/handle-unknown-error";
import type { AmmRpcData } from "@raydium-io/raydium-sdk-v2";
import { type ResultAsync, fromPromise } from "neverthrow";
import { client } from "../client";

/**
 * Gets the RPC pool data for a given pool ID
 * @param poolId Pool ID
 * @returns ResultAsync<AmmRpcData, Error>
 */
export const getAmmRpcPoolData = (poolId: string): ResultAsync<AmmRpcData, Error> => {
	return fromPromise(
		client.liquidity.getRpcPoolInfo(poolId),
		(error) => new Error("Failed to get AMM RPC pool data", { cause: handleUnknownError(error) }),
	);
};
