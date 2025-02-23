import { redis } from "$/redis";
import { handleUnknownError } from "$/utils/handle-unknown-error";
import { type ResultAsync, errAsync, fromPromise, okAsync } from "neverthrow";
import type { NewToken } from "../types";

export const NEW_TOKENS_KEY = "new:tokens";
const NEW_TOKENS_MAX_AGE_MS = 10 * 60 * 1000; // New tokens max age is 10 minutes

const MIN_BUYABLE_AGE_MS = 30 * 1000; // Min buyable age is 30 seconds
const MAX_BUYABLE_AGE_MS = 60 * 1000; // Max buyable age is 1 minute
const BUYABLE_AGE_RANGE_MS = MAX_BUYABLE_AGE_MS - MIN_BUYABLE_AGE_MS;

/**
 * Gets a random buyable age in milliseconds between MIN_BUYABLE_AGE_MS and MAX_BUYABLE_AGE_MS
 * @returns number
 */
const getRandomBuyableAgeMs = (): number => {
	const randomInt = Math.floor(Math.random() * BUYABLE_AGE_RANGE_MS);
	return randomInt + MIN_BUYABLE_AGE_MS;
};

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
 * Gets all the new tokens with a score between 30-60 seconds ago and less than 1 hour ago
 * @returns ResultAsync<NewToken[], Error>
 */
const getTokensEligibleForBuying = (): ResultAsync<NewToken[], Error> => {
	const now = Date.now();

	const minBuyableAge = now - getRandomBuyableAgeMs(); // Min buyable age (anywhere between 30 secs and 1 minute)
	const maxNewTokenAge = now - NEW_TOKENS_MAX_AGE_MS; // Maxc age of the new tokens (10 minutes)

	return fromPromise(
		redis.zrange<NewToken[]>(NEW_TOKENS_KEY, maxNewTokenAge, minBuyableAge, {
			byScore: true,
		}),
		(error) => new Error("Failed to execute Redis ZRANGE", { cause: handleUnknownError(error) }),
	).mapErr((error) => new Error("Failed to get new tokens eligible for buying from Redis", { cause: error }));
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
	removeExpiredTokens,
} as const;
