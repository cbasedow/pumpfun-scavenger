import { redis } from "$/redis";
import { handleUnknownError } from "$/utils/handle-unknown-error";
import { type ResultAsync, errAsync, fromPromise, okAsync } from "neverthrow";
import type { BoughtToken, NewToken } from "../types";
import { NEW_TOKENS_KEY } from "./new-tokens";

const BOUGHT_TOKENS_KEY = "bought:tokens";

const MIN_SELLABLE_AGE_MS = 10 * 60 * 1000; // 10 minutes Minimum age of a bought token to sell
const MAX_SELLABLE_AGE_MS = 20 * 60 * 1000; // 20 minutes Maximum age of a bought token to sell
const SELLABLE_AGE_RANGE_MS = MAX_SELLABLE_AGE_MS - MIN_SELLABLE_AGE_MS; // Age range of a bought token to sell

/**
 * Calculates a random sellable age between 10 and 20 minutes in milliseconds
 * @returns number
 */
const getRandomSellableAgeDelay = (): number => {
	return Math.floor(Math.random() * SELLABLE_AGE_RANGE_MS) + MIN_SELLABLE_AGE_MS;
};

/**
 * Removes the token from the new tokens zset and adds it to the bought tokens zset
 * @param boughtToken
 * @param newToken
 * @returns ResultAsync<number[], Error>
 */
const addToken = (boughtToken: BoughtToken, newToken: NewToken): ResultAsync<number[], Error> => {
	const score = Date.now(); // Current timestamp as score

	return fromPromise(
		redis
			.multi()
			.zrem<NewToken>(NEW_TOKENS_KEY, newToken)
			.zadd<BoughtToken>(BOUGHT_TOKENS_KEY, {
				score,
				member: boughtToken,
			})
			.exec(),
		(error) => new Error("Failed to execute Redis transaction", { cause: handleUnknownError(error) }),
	)
		.andThen(([zRemResult, zAddResult]) => {
			if (zAddResult === null) {
				return errAsync(new Error("ZADD operation returned null"));
			}

			return okAsync([zRemResult, zAddResult]);
		})
		.mapErr((error) => new Error("Failed to add bought token to Redis", { cause: error }));
};

/**
 * Gets all eligible bought tokens that were bought between a random age of 15 to 30 minutes ago
 * @returns ResultAsync<BoughtToken[], Error>
 */
const getTokensEligibleForSelling = (): ResultAsync<BoughtToken[], Error> => {
	const now = Date.now();
	const max = now - getRandomSellableAgeDelay();

	return fromPromise(
		redis.zrange<BoughtToken[]>(BOUGHT_TOKENS_KEY, "-inf", max, {
			byScore: true,
		}),
		(error) => new Error("Failed to execute Redis ZRANGE", { cause: handleUnknownError(error) }),
	).mapErr((error) => new Error("Failed to get bought tokens eligible for selling from Redis", { cause: error }));
};

/**
 * Removes a bought token from the redis bought tokens zset
 * @param boughtToken
 * @returns ResultAsync<number, Error>
 */
const removeToken = (boughtToken: BoughtToken): ResultAsync<number, Error> => {
	return fromPromise(
		redis.zrem<BoughtToken>(BOUGHT_TOKENS_KEY, boughtToken),
		(error) => new Error("Failed to execute Redis ZREM", { cause: handleUnknownError(error) }),
	).mapErr((error) => new Error("Failed to remove bought token from Redis", { cause: error }));
};

export const boughtTokensStore = {
	addToken,
	getTokensEligibleForSelling,
	removeToken,
} as const;
