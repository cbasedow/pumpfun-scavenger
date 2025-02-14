import { solanaRpc } from "$/solana-rpc";
import { handleUnknownError } from "$/utils/handle-unknown-error";
import { bool, u64 } from "$/utils/solana-buffer-layout";
import { struct } from "@solana/buffer-layout";
import type { PublicKey } from "@solana/web3.js";
import { type ResultAsync, errAsync, fromThrowable } from "neverthrow";
import type { BondingCurveState } from "../types";

const DISCRIMINATOR_SIZE = 8 as const; // u64

const CURVE_LAYOUT = struct<BondingCurveState>([
	u64("virtualTokenReserves"),
	u64("virtualSolReserves"),
	u64("realTokenReserves"),
	u64("realSolReserves"),
	u64("tokenTotalSupply"),
	bool("complete"),
]);

/**
 * Decodes the bonding curve state from a given bonding curve account
 * @param bondingCurvePubkey Public key of the bonding curve account
 * @returns ResultAsync<BondingCurveState, Error>
 */
export const decodeBondingCurveState = (bondingCurvePubkey: PublicKey): ResultAsync<BondingCurveState, Error> => {
	return solanaRpc
		.getAccountInfo(bondingCurvePubkey)
		.andThen((accountInfo) => {
			if (!accountInfo) {
				return errAsync(new Error("Bonding curve account not found"));
			}

			const data = accountInfo.data;
			// Skip the discriminator
			const buffer = data.subarray(DISCRIMINATOR_SIZE);

			return fromThrowable(
				() => {
					return CURVE_LAYOUT.decode(buffer);
				},
				(error) => new Error(`Curve layout decode failed: ${handleUnknownError(error).message}`),
			)();
		})
		.mapErr((error) => new Error("Failed to decode bonding curve state", { cause: error }));
};
