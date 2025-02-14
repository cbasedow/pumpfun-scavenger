import { redis } from "$/redis";
import { handleUnknownError } from "$/utils/handle-unknown-error";
import { type ResultAsync, errAsync, fromPromise, okAsync } from "neverthrow";
import type { NewToken } from "../types";

export const NEW_TOKENS_KEY = "new:tokens";
const NEW_TOKENS_MAX_AGE_MS = 60 * 60 * 1000; // New tokens max age is 1 hour
const BUYABLE_AGE_MS = 2 * 60 * 1000; // New tokens are eligible for buying after 2 minutes

/**
 * Adds a new token to the redis new tokens zset
 * @param newToken
 * @returns ResultAsync<number, Error>
 */
const addToken = (newToken: NewToken): ResultAsync<number, Error> => {
	const score = Date.now(); // Current timestamp as score

	return fromPromise(
		redis.zadd<NewToken>(NEW_TOKENS_KEY, {
			score,
			member: newToken,
		}),
		(error) => new Error("Failed to execute Redis ZADD", { cause: handleUnknownError(error) }),
	)
		.andThen((result) => {
			if (result === null) {
				return errAsync(new Error("ZADD operation returned null"));
			}
			return okAsync(result);
		})
		.mapErr((error) => new Error("Failed to add new token to Redis", { cause: error }));
};

/**
 * Gets all the new tokens with a score greater than 2 minutes ago and less than 1 hour ago
 * @returns ResultAsync<NewToken[], Error>
 */
const getTokensEligibleForBuying = (): ResultAsync<NewToken[], Error> => {
	const now = Date.now();

	const minBuyableAge = now - BUYABLE_AGE_MS; // 2 minutes ago
	const maxNewTokenAge = now - NEW_TOKENS_MAX_AGE_MS; // 1 hour ago

	return fromPromise(
		redis.zrange<NewToken[]>(NEW_TOKENS_KEY, maxNewTokenAge, minBuyableAge, {
			byScore: true,
		}),
		(error) => new Error("Failed to execute Redis ZRANGE", { cause: handleUnknownError(error) }),
	).mapErr((error) => new Error("Failed to get new tokens eligible for buying from Redis", { cause: error }));
};

/**
 * Updates the score of a token in the new tokens zset
 * @param token
 * @returns ResultAsync<number, Error>
 */
const updateTokenScore = (token: NewToken): ResultAsync<number, Error> => {
	const score = Date.now(); // New score will be the current timestamp

	return fromPromise(
		redis.zadd<NewToken>(
			NEW_TOKENS_KEY,
			{
				xx: true, // Only update the score if the token exists
			},
			{
				score,
				member: token,
			},
		),
		(error) => new Error("Failed to execute Redis ZADD", { cause: handleUnknownError(error) }),
	)
		.andThen((result) => {
			if (result === null) {
				return errAsync(new Error("ZADD operation returned null"));
			}
			return okAsync(result);
		})
		.mapErr((error) => new Error("Failed to update new token score in Redis", { cause: error }));
};

/**
 * Removes any expired tokens from the new tokens zset
 * @returns ResultAsync<number, Error>
 */
const removeExpiredTokens = (): ResultAsync<number, Error> => {
	return fromPromise(
		redis.zrange<NewToken[]>(NEW_TOKENS_KEY, "-inf", "+inf", {
			byScore: true,
		}),
		(error) => new Error("Failed to execute Redis ZRANGE", { cause: handleUnknownError(error) }),
	)
		.andThen((tokens) => {
			if (tokens.length === 0) {
				return okAsync(0);
			}

			const now = Date.now();

			const expiredTokens = tokens.filter((token) => token.addedAt + NEW_TOKENS_MAX_AGE_MS < now);

			if (expiredTokens.length === 0) {
				return okAsync(0);
			}

			return fromPromise(
				redis.zrem(NEW_TOKENS_KEY, ...expiredTokens),
				(error) => new Error("Failed to execute Redis ZREM", { cause: handleUnknownError(error) }),
			);
		})
		.mapErr((error) => new Error(`Failed to remove expired new tokens from Redis: ${error.message}`));
};

export const newTokensStore = {
	addToken,
	getTokensEligibleForBuying,
	updateTokenScore,
	removeExpiredTokens,
} as const;
