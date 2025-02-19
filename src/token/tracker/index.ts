import { logger } from "$/utils/logger";
import { sleepMs } from "$/utils/sleep";
import { type ResultAsync, okAsync } from "neverthrow";
import { checkBoughtTokens } from "./check-bought-tokens";
import { checkNewTokens } from "./check-new-tokens";

const CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds
const COOL_DOWN_MS = 1000 as const; // 1 second

/**
 * A worker that checks for new tokens and bought tokens every CHECK_INTERVAL_MS
 * @param minSolBuyAmount
 * @param buySlippagePct
 * @param sellSlippagePct
 * @returns ResultAsync<void, Error>
 */
export const startTokenTracker = (
	minSolBuyAmount: bigint,
	buySlippagePct: number,
	sellSlippagePct: number,
): ResultAsync<void, Error> => {
	const runChecks = (): ResultAsync<void, Error> => {
		return checkNewTokens(minSolBuyAmount, buySlippagePct)
			.andThen((newTokensStatus) => {
				logger.info({
					msg: "New tokens check complete",
					newTokensStatus,
				});
				return sleepMs(COOL_DOWN_MS).andThen(() => {
					return checkBoughtTokens(sellSlippagePct).andThen((boughtTokensStatus) => {
						logger.info({
							msg: "Bought tokens check complete",
							boughtTokensStatus,
						});

						setTimeout(() => runChecks(), CHECK_INTERVAL_MS);
						return okAsync(undefined);
					});
				});
			})
			.mapErr((error) => new Error("Token tracking failed", { cause: error }));
	};

	// Start the recursive check cycle
	return runChecks();
};
