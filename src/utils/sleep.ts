import { sleep } from "bun";
import { type ResultAsync, fromSafePromise } from "neverthrow";

/**
 * Resolves a ResultAsync after the specified number of milliseconds
 * @param ms Number of milliseconds to sleep
 * @returns ResultAsync<void, never>
 */
export const sleepMs = (ms: number): ResultAsync<void, never> => {
	return fromSafePromise(sleep(ms));
};
