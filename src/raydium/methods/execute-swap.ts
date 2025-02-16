import { handleUnknownError } from "$/utils/handle-unknown-error";
import type { SwapParam, TxVersion } from "@raydium-io/raydium-sdk-v2";
import { type ResultAsync, fromPromise } from "neverthrow";
import { raydium } from "../client";

/**
 * Executes a swap
 * @param params.poolInfo Pool info
 * @param params.poolKeys Pool keys
 * @param params.amountIn Amount in
 * @param params.amountOut Amount out
 * @param params.fixedSide Fixed side
 * @param params.inputMint Input mint
 * @param params.txVersion Transaction version
 * @param params.computeBudgetConfig Compute budget config
 * @returns ResultAsync<string (transaction signature), Error>
 */
export const executeSwap = (params: SwapParam<TxVersion.V0>): ResultAsync<string, Error> => {
	return fromPromise(
		raydium.liquidity.swap(params),
		(error) => new Error("Failed to build swap transaction data", { cause: handleUnknownError(error) }),
	)
		.andThen((buildSwapTxData) => {
			const { execute } = buildSwapTxData;

			return fromPromise(
				execute({
					skipPreflight: true,
				}),
				(error) => new Error("Failed to execute swap transaction", { cause: handleUnknownError(error) }),
			).map(({ txId }) => txId);
		})
		.mapErr((error) => new Error("Failed to execute swap", { cause: error }));
};
