import { handleUnknownError } from "$/utils/handle-unknown-error";
import type { ComputeAmountOutParam } from "@raydium-io/raydium-sdk-v2";
import type BN from "bn.js";
import type Decimal from "decimal.js";
import { type Result, fromThrowable } from "neverthrow";
import { raydium } from "../client";

type ComputeOut = {
	amountOut: BN;
	minAmountOut: BN;
	currentPrice: Decimal;
	executionPrice: Decimal;
	priceImpact: Decimal;
	fee: BN;
};

/**
 * Computes the amount out for a given swap
 * @param params.poolInfo Pool info
 * @param params.amountIn Amount in
 * @param params.mintIn Mint in
 * @param params.mintOut Mint out
 * @param params.slippage Slippage
 * @returns Result<ComputeOut, Error>
 */
export const computeAmountOut = (params: ComputeAmountOutParam): Result<ComputeOut, Error> => {
	return fromThrowable(
		() => {
			return raydium.liquidity.computeAmountOut(params);
		},
		(error) => new Error("Failed to compute amount out", { cause: handleUnknownError(error) }),
	)();
};
