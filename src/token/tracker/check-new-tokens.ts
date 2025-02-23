import { pumpfun } from "$/solana/pumpfun";
import { chunk } from "$/utils/chunk";
import { logger } from "$/utils/logger";
import { createPubkeys } from "$/utils/public-key";
import { sleepMs } from "$/utils/sleep";
import { ResultAsync, okAsync } from "neverthrow";
import { boughtTokensStore } from "../store/bought-tokens";
import { newTokensStore } from "../store/new-tokens";
import type { BoughtToken, NewToken } from "../types";

const CHECK_NEW_TOKENS_STATUS = {
	NO_ELIGIBLE_NEW_TOKENS: "NO_ELIGIBLE_NEW_TOKENS",
	COMPLETED: "COMPLETED",
} as const;

type CheckNewTokensStatus = (typeof CHECK_NEW_TOKENS_STATUS)[keyof typeof CHECK_NEW_TOKENS_STATUS];

const MAX_BATCH_SIZE = 20 as const;
const BATCH_PROCESSING_DELAY_MS = 1000 as const; // 1 second between batch processing

/**
 * Checks for new tokens eligible for buying
 * If there are no eligible new tokens, returns NO_ELIGIBLE_NEW_TOKENS
 * If there are eligible new tokens, attempts to buy them on Pumpfun when the bonding curve is the only holder
 * @param minSolBuyAmount
 * @param buySlippagePct
 * @returns ResultAsync<CheckNewTokensStatus, Error>
 */
export const checkNewTokens = (
	minSolBuyAmount: bigint,
	buySlippagePct: number,
): ResultAsync<CheckNewTokensStatus, Error> => {
	return newTokensStore
		.removeExpiredTokens()
		.andThen(() => {
			return newTokensStore.getTokensEligibleForBuying().andThen((eligibleTokens) => {
				if (eligibleTokens.length === 0) {
					logger.debug("No new tokens eligible for buying");
					return okAsync(CHECK_NEW_TOKENS_STATUS.NO_ELIGIBLE_NEW_TOKENS);
				}
				logger.info(`Found ${eligibleTokens.length} new tokens eligible for buying`);

				const batches = chunk(eligibleTokens, MAX_BATCH_SIZE);

				let result: ResultAsync<void, Error> = okAsync(undefined);

				for (const [index, batch] of batches.entries()) {
					result = result.andThen(() => {
						const sleepResult = index > 0 ? sleepMs(BATCH_PROCESSING_DELAY_MS) : okAsync(undefined);

						return sleepResult.andThen(() => {
							return ResultAsync.combine(
								batch.map((tokenEligibleForBuying) => {
									return processBuyableNewToken(tokenEligibleForBuying, minSolBuyAmount, buySlippagePct);
								}),
							)
								.map(() =>
									logger.info(
										`Successfully processed ${index + 1}/${batches.length} batch of new tokens eligible for buying`,
									),
								)
								.mapErr(
									(error) =>
										new Error(`Failed to process buyable new tokens batch ${index + 1}/${batches.length}`, {
											cause: error,
										}),
								);
						});
					});
				}

				return result.map(() => {
					logger.info(`Successfully processed ${eligibleTokens.length} new tokens eligible for buying`);
					return CHECK_NEW_TOKENS_STATUS.COMPLETED;
				});
			});
		})
		.mapErr((error) => new Error("Failed to check new tokens", { cause: error }));
};

const processBuyableNewToken = (
	newToken: NewToken,
	minSolBuyAmount: bigint,
	buySlippagePct: number,
): ResultAsync<void, Error> => {
	const { mintAddress, bondingCurveAddress, associatedBondingCurveAddress } = newToken;

	// Check if the bonding curve is the only holder and return false if there was an error
	return pumpfun
		.isBondingCurveOnlyHolder(mintAddress, bondingCurveAddress)
		.orElse(() => okAsync(false))
		.andThen((bondingOnlyHolder) => {
			if (bondingOnlyHolder === false) {
				// Return early if bonding curve isnt the only holder
				return okAsync(undefined);
			}

			return createPubkeys([mintAddress, bondingCurveAddress, associatedBondingCurveAddress]).asyncAndThen(
				([mintPubkey, bondingCurvePubkey, associatedBondingCurvePubkey]) => {
					return pumpfun.decodeBondingCurveState(bondingCurvePubkey).andThen((bondingCurveState) => {
						if (bondingCurveState.complete === true) {
							logger.debug(`Bonding curve for token ${mintAddress} already migrated, skipping`);
							return okAsync(undefined); // Skip if bonding curve migrated
						}

						return pumpfun
							.buyToken({
								mintPubkey,
								bondingCurvePubkey,
								associatedBondingCurvePubkey,
								bondingCurveState,
								minSolBuyAmount,
								buySlippagePct,
							})
							.andThen(({ txnSignature, boughtAtMcapSolStr }) => {
								logger.info({ msg: `Bought ${mintAddress} on Pumpfun`, txnSignature });
								const boughtToken: BoughtToken = {
									mintAddress,
									bondingCurveAddress,
									associatedBondingCurveAddress,
									txnSignature,
									boughtAt: Date.now(),
									boughtAtMcapSolStr,
									totalChecks: 0,
								};

								return boughtTokensStore.addToken(boughtToken, newToken);
							});
					});
				},
			);
		})
		.map(() => logger.debug(`Successfully processed new token ${mintAddress} eligible for buying`))
		.mapErr((error) => new Error(`Failed to process new token ${mintAddress} eligible for buying`, { cause: error }));
};
