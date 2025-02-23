import { SOL_LAMPORTS_DECIMALS } from "$/solana/constants";
import { handleUnknownError } from "$/utils/handle-unknown-error";
import BigNumber from "bignumber.js";
import { type Result, err, fromThrowable } from "neverthrow";
import { PUMPFUN_TOKEN_DECIMALS } from "../constants";
import type { BondingCurveState } from "../types";

/**
 * Calculates the current market cap in SOL for a given Pumpfun bonding curve state
 * @param bondingCurveState
 * @returns Result<BigNumber, Error>
 */
export const calculateCurrMcapSolBn = (bondingCurveState: BondingCurveState): Result<BigNumber, Error> => {
	const { virtualSolReserves, virtualTokenReserves, tokenTotalSupply, complete } = bondingCurveState;

	if (complete === true) {
		return err(new Error("Failed to calculate current market cap in SOL: Bonding curve migrated"));
	}

	return fromThrowable(
		() => {
			const virtualSolReservesBn = new BigNumber(virtualSolReserves.toString()).shiftedBy(-SOL_LAMPORTS_DECIMALS);
			const virtualTokenReservesBn = new BigNumber(virtualTokenReserves.toString()).shiftedBy(-PUMPFUN_TOKEN_DECIMALS);

			const tokenTotalSupplyBn = new BigNumber(tokenTotalSupply.toString()).shiftedBy(-PUMPFUN_TOKEN_DECIMALS);

			const priceSolBn = virtualSolReservesBn.dividedBy(virtualTokenReservesBn);
			const mcapSolBn = priceSolBn.multipliedBy(tokenTotalSupplyBn);

			return mcapSolBn;
		},
		(error) =>
			new Error("Failed to calculate current market cap in SOL", {
				cause: handleUnknownError(error),
			}),
	)();
};
