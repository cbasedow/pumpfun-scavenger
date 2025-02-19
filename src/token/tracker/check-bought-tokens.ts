import { pumpfun } from "$/pumpfun";
import { raydium } from "$/raydium";
import { chunk } from "$/utils/chunk";
import { logger } from "$/utils/logger";
import { createPubkeys } from "$/utils/public-key";
import { sleepMs } from "$/utils/sleep";
import { ResultAsync, okAsync } from "neverthrow";
import { boughtTokensStore } from "../store/bought-tokens";
import type { BoughtToken } from "../types";

const CHECK_BOUGHT_TOKENS_STATUS = {
	NO_ELIGIBLE_BOUGHT_TOKENS: "NO_ELIGIBLE_BOUGHT_TOKENS",
	COMPLETED: "COMPLETED",
} as const;

type CheckBoughtTokensStatus = (typeof CHECK_BOUGHT_TOKENS_STATUS)[keyof typeof CHECK_BOUGHT_TOKENS_STATUS];

const MAX_BATCH_SIZE = 20 as const;
const BATCH_PROCESSING_DELAY_MS = 1000 as const; // 1 second between batch processing

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
								return processTokenEligibleForSelling(tokenEligibleForSelling, sellSlippagePct);
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

const processTokenEligibleForSelling = (
	eligibleToken: BoughtToken,
	sellSlippagePct: number,
): ResultAsync<void, Error> => {
	const { mintAddress, bondingCurveAddress, associatedBondingCurveAddress } = eligibleToken;

	return createPubkeys([mintAddress, bondingCurveAddress, associatedBondingCurveAddress])
		.asyncAndThen(([mintPubkey, bondingCurvePubkey, associatedBondingCurvePubkey]) => {
			return pumpfun.decodeBondingCurveState(bondingCurvePubkey).andThen((bondingCurveState) => {
				if (bondingCurveState.complete === true) {
					// Sell on Raydium if the bonding curve is already migrated to Raydium
					logger.debug(`Bonding curve for token ${mintAddress} migrated, attempting to sell on Raydium`);
					return raydium.sellToken(mintPubkey, sellSlippagePct).andThen((raydiumSellTxnSignature) => {
						logger.info({
							msg: `Successfully sold token ${mintAddress} on Raydium`,
							txnSignature: raydiumSellTxnSignature,
						});

						return boughtTokensStore.removeToken(eligibleToken).map(() => {
							logger.debug({
								msg: `Successfully removed bought token ${mintAddress} from the bought tokens store`,
								boughtToken: eligibleToken,
							});
						});
					});
				}

				// Sell on Pumpfun if the bonding curve is not already migrated to Raydium
				logger.debug(`Bonding curve for token ${mintAddress} not migrated, attempting to sell on Pumpfun`);
				return pumpfun
					.sellToken({
						mintPubkey,
						bondingCurvePubkey,
						associatedBondingCurvePubkey,
						bondingCurveState,
						sellSlippagePct,
					})
					.andThen((pumpfunSellTxnSignature) => {
						logger.info({
							msg: `Successfully sold token ${mintAddress} on Pumpfun`,
							txnSignature: pumpfunSellTxnSignature,
						});
						return boughtTokensStore.removeToken(eligibleToken).map(() =>
							logger.info({
								msg: `Successfully removed bought token ${mintAddress} from the bought tokens store`,
								boughtToken: eligibleToken,
							}),
						);
					});
			});
		})
		.map(() => logger.debug(`Successfully processed bought token ${mintAddress} eligible for selling`))
		.mapErr(
			(error) => new Error(`Failed to process bought token ${mintAddress} eligible for selling`, { cause: error }),
		);
};
