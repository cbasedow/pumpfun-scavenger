import { helius } from "$/solana/helius";
import type { ResultAsync } from "neverthrow";

/**
 * Checks if the bonding curve is the only token holder of a given token
 * @param mintAddress Mint address of the token
 * @param bondingCurveAddress Address of the bonding curve
 * @returns ResultAsync<boolean, Error>
 */
export const isBondingCurveOnlyHolder = (
	mintAddress: string,
	bondingCurveAddress: string,
): ResultAsync<boolean, Error> => {
	return helius
		.getTokenHolders(mintAddress)
		.map((tokenHolders) => {
			if (tokenHolders.length === 0) {
				return false;
			}

			// Filter out any token holders with a non-zero amount
			const nonZeroHolders = tokenHolders.filter((tokenHolder) => tokenHolder.tokenAmount.amount !== "0");

			// If there is only one holder and it's the bonding curve address, then the bonding curve is the only holder
			return nonZeroHolders.length === 1 && nonZeroHolders[0].owner === bondingCurveAddress;
		})
		.mapErr((error) => new Error(`Failed to check if bonding curve is only holder: ${error.message}`));
};
