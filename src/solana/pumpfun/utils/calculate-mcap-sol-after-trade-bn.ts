import { SOL_LAMPORTS_DECIMALS } from "$/solana/constants";
import { handleUnknownError } from "$/utils/handle-unknown-error";
import BigNumber from "bignumber.js";
import { type Result, err, fromThrowable } from "neverthrow";
import { PUMPFUN_TOKEN_DECIMALS } from "../constants";
import type { BondingCurveState } from "../types";

type CalculateMcapSolAfterTradeParams = {
	bondingCurveState: BondingCurveState;
	tokensToTrade: bigint;
	tradeType: "BUY" | "SELL";
};

/**
 * Calculates the market cap in SOL for a given Pumpfun bonding curve state after a buy or sell
 * @param params.bondingCurveState
 * @param params.tokensToTrade
 * @param params.tradeType
 * @returns Result<BigNumber, Error>
 */
export const calculateMcapSolAfterTradeBn = (params: CalculateMcapSolAfterTradeParams): Result<BigNumber, Error> => {
	const { bondingCurveState, tokensToTrade, tradeType } = params;
	const { virtualSolReserves, virtualTokenReserves, tokenTotalSupply, complete } = bondingCurveState;

	if (complete === true) {
		return err(new Error("Failed to calculate market cap in SOL after trade: Bonding curve migrated"));
	}

	if (tradeType !== "BUY" && tradeType !== "SELL") {
		return err(
			new Error(
				`Failed to calculate market cap in SOL after trade: Received invalid trade type ${tradeType}, expected BUY or SELL`,
			),
		);
	}

	return fromThrowable(
		() => {
			const virtualSolReservesBn = new BigNumber(virtualSolReserves.toString()).shiftedBy(-SOL_LAMPORTS_DECIMALS);
			const virtualTokenReservesBn = new BigNumber(virtualTokenReserves.toString()).shiftedBy(-PUMPFUN_TOKEN_DECIMALS);

			const tokenTotalSupplyBn = new BigNumber(tokenTotalSupply.toString()).shiftedBy(-PUMPFUN_TOKEN_DECIMALS);

			const tokensToTradeBn = new BigNumber(tokensToTrade.toString()).shiftedBy(-PUMPFUN_TOKEN_DECIMALS);

			if (tradeType === "BUY") {
				const virtualTokenReservesAfterBuyBn = virtualTokenReservesBn.minus(tokensToTradeBn);
				const priceSolAfterBuyBn = virtualSolReservesBn.dividedBy(virtualTokenReservesAfterBuyBn);
				const mcapSolAfterBuyBn = priceSolAfterBuyBn.multipliedBy(tokenTotalSupplyBn);

				return mcapSolAfterBuyBn;
			}

			// SELL
			const virtualTokenReservesAfterSellBn = virtualTokenReservesBn.plus(tokensToTradeBn);
			const priceSolAfterSellBn = virtualSolReservesBn.dividedBy(virtualTokenReservesAfterSellBn);
			const mcapSolAfterSellBn = priceSolAfterSellBn.multipliedBy(tokenTotalSupplyBn);

			return mcapSolAfterSellBn;
		},
		(error) =>
			new Error(`Failed to calculate market cap in SOL after a ${tradeType} for ${tokensToTrade} tokens`, {
				cause: handleUnknownError(error),
			}),
	)();
};
