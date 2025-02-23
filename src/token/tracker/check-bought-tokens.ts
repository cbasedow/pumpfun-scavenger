import { type BondingCurveState, pumpfun } from "$/solana/pumpfun";
import { calculateCurrMcapSolBn } from "$/solana/pumpfun/utils/calculate-curr-mcap-sol-bn";
import { raydium } from "$/solana/raydium";
import { chunk } from "$/utils/chunk";
import { handleUnknownError } from "$/utils/handle-unknown-error";
import { logger } from "$/utils/logger";
import { createPubkeys } from "$/utils/public-key";
import { sleepMs } from "$/utils/sleep";
import BigNumber from "bignumber.js";
import { type Result, ResultAsync, fromThrowable, ok, okAsync } from "neverthrow";
import { boughtTokensStore } from "../store/bought-tokens";
import type { BoughtToken } from "../types";

const CHECK_BOUGHT_TOKENS_STATUS = {
	NO_ELIGIBLE_BOUGHT_TOKENS: "NO_ELIGIBLE_BOUGHT_TOKENS",
	COMPLETED: "COMPLETED",
} as const;

type CheckBoughtTokensStatus = (typeof CHECK_BOUGHT_TOKENS_STATUS)[keyof typeof CHECK_BOUGHT_TOKENS_STATUS];

const MAX_BATCH_SIZE = 20 as const;
const BATCH_PROCESSING_DELAY_MS = 1000 as const; // 1 second between batch processing

const MAX_CHECKS = 3 as const; // Maximum number of checks before selling all tokens

const MAX_BOUGHT_TOKEN_AGE_MS = 20 * 60 * 1000; // 20 minutes max age until selling 100% of the token

/**
 * Checks for bought tokens eligible for selling
 * If there are no eligible bought tokens, returns NO_ELIGIBLE_BOUGHT_TOKENS
 * If there are eligible bought tokens, attempts to sell them on Raydium or Pumpfun
 * @param sellSlippagePct
 * @returns ResultAsync<CheckBoughtTokensStatus, Error>
 */
export const checkBoughtTokens = (sellSlippagePct: number): ResultAsync<CheckBoughtTokensStatus, Error> => {
	return boughtTokensStore
		.getTokensEligibleForSelling()
		.andThen((eligibleTokens) => {
			if (eligibleTokens.length === 0) {
				logger.debug("No bought tokens eligible for selling");
				return okAsync(CHECK_BOUGHT_TOKENS_STATUS.NO_ELIGIBLE_BOUGHT_TOKENS);
			}

			logger.info(`Found ${eligibleTokens.length} bought tokens eligible for selling`);

			const batches = chunk(eligibleTokens, MAX_BATCH_SIZE);

			let result: ResultAsync<void, Error> = okAsync(undefined);

			for (const [index, batch] of batches.entries()) {
				result = result.andThen(() => {
					const sleepResult = index > 0 ? sleepMs(BATCH_PROCESSING_DELAY_MS) : okAsync(undefined);

					return sleepResult.andThen(() =>
						ResultAsync.combine(
							batch.map((tokenEligibleForSelling) => {
								return processSellableBoughtToken(tokenEligibleForSelling, sellSlippagePct);
							}),
						)
							.map(() =>
								logger.info(
									`Successfully processed ${index + 1}/${batches.length} batch of bought tokens eligible for selling`,
								),
							)
							.mapErr(
								(error) =>
									new Error(`Failed to process sellable bought tokens batch ${index + 1}/${batches.length}`, {
										cause: error,
									}),
							),
					);
				});
			}

			return result.map(() => {
				logger.info(`Successfully processed ${eligibleTokens.length} bought tokens eligible for selling`);
				return CHECK_BOUGHT_TOKENS_STATUS.COMPLETED;
			});
		})
		.mapErr((error) => new Error("Failed to check bought tokens", { cause: error }));
};

const processSellableBoughtToken = (boughtToken: BoughtToken, sellSlippagePct: number): ResultAsync<void, Error> => {
	const { mintAddress, bondingCurveAddress, associatedBondingCurveAddress, boughtAt, boughtAtMcapSolStr, totalChecks } =
		boughtToken;

	return createPubkeys([mintAddress, bondingCurveAddress, associatedBondingCurveAddress])
		.asyncAndThen(([mintPubkey, bondingCurvePubkey, associatedBondingCurvePubkey]) => {
			return pumpfun.decodeBondingCurveState(bondingCurvePubkey).andThen((bondingCurveState) => {
				if (bondingCurveState.complete === true) {
					// Sell 100% of the token if the bonding curve has already migrated to Raydium
					return raydium.sellToken(mintPubkey, sellSlippagePct).andThen((raydiumSellTxnSignature) => {
						return boughtTokensStore.removeToken(boughtToken).map(() => {
							logger.info({
								msg: `Sold ${mintAddress} on Raydium and removed from the bought tokens store`,
								txnSignature: raydiumSellTxnSignature,
							});
						});
					});
				}
				return calculatePercentToSell(totalChecks, boughtAt, boughtAtMcapSolStr, bondingCurveState).asyncAndThen(
					(percentOfTokensToSell) => {
						logger.info({
							msg: `Calculated percent to sell for token ${mintAddress}`,
							percentOfTokensToSell,
						});

						if (percentOfTokensToSell === 0) {
							return boughtTokensStore.updateTokenScoreAndTotalChecks(boughtToken).map(() => undefined);
						}

						return pumpfun
							.sellToken({
								mintPubkey,
								bondingCurvePubkey,
								associatedBondingCurvePubkey,
								bondingCurveState,
								sellSlippagePct,
								percentOfTokensToSell,
							})
							.andThen((sellTxnSignature) => {
								if (percentOfTokensToSell === 100) {
									return boughtTokensStore.removeToken(boughtToken).map(() =>
										logger.info({
											msg: `Sold 100% of ${mintAddress} on Pumpfun`,
											txnSignature: sellTxnSignature,
										}),
									);
								}

								return boughtTokensStore.updateTokenScoreAndTotalChecks(boughtToken).map(() =>
									logger.info({
										msg: `Sold ${percentOfTokensToSell}% of ${mintAddress} on Pumpfun`,
										txnSignature: sellTxnSignature,
									}),
								);
							});
					},
				);
			});
		})
		.map(() => logger.debug(`Successfully processed bought token ${mintAddress} eligible for selling`))
		.mapErr(
			(error) => new Error(`Failed to process bought token ${mintAddress} eligible for selling`, { cause: error }),
		);
};

type PercentToSell = 0 | 25 | 75 | 100;

const calculatePercentToSell = (
	totalChecks: number,
	boughtAt: number,
	boughtAtMcapSolStr: string,
	bondingCurveState: BondingCurveState,
): Result<PercentToSell, Error> => {
	const ageMs = Date.now() - boughtAt;
	// Sell 100% of the token balance if we are on the last check or the token is too old
	if (totalChecks + 1 >= MAX_CHECKS || ageMs > MAX_BOUGHT_TOKEN_AGE_MS) {
		return ok(100);
	}

	return calculateCurrMcapSolBn(bondingCurveState).andThen((currMcapSolBn) => {
		return fromThrowable(
			() => {
				const boughtAtMcapSolBn = new BigNumber(boughtAtMcapSolStr);
				const mcapSolPercentDiffBn = currMcapSolBn
					.minus(boughtAtMcapSolBn)
					.dividedBy(boughtAtMcapSolBn)
					.multipliedBy(100);
				return mcapSolPercentDiffBn.toNumber();
			},
			(error) =>
				new Error("Failed to calculate market cap SOL percent difference", { cause: handleUnknownError(error) }),
		)().map((mcapSolPercentDiff) => {
			if (mcapSolPercentDiff >= 500) {
				return 75; // Sell 75% of the token balance if the market cap SOL percent difference is greater than 500%
			}

			if (mcapSolPercentDiff >= 100) {
				return 25; // Sell 25% of the token balance if the market cap SOL percent difference is greater than 100%
			}

			return 0; // Sell 0% of the token balance if the market cap SOL percent difference is less than 100%
		});
	});
};
