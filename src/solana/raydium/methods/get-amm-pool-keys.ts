import { handleUnknownError } from "$/utils/handle-unknown-error";
import type { AmmV4Keys, AmmV5Keys } from "@raydium-io/raydium-sdk-v2";
import { type ResultAsync, fromPromise } from "neverthrow";
import { client } from "../client";

/**
 * Gets the pool keys for a given pool ID
 * @param poolId Pool ID
 * @returns ResultAsync<AmmV4Keys | AmmV5Keys, Error>
 */
export const getAmmPoolKeys = (poolId: string): ResultAsync<AmmV4Keys | AmmV5Keys, Error> => {
	return fromPromise(
		client.liquidity.getAmmPoolKeys(poolId),
		(error) => new Error("Failed to get AMM pool keys", { cause: handleUnknownError(error) }),
	);
};
