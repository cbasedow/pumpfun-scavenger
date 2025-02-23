export type BondingCurveState = {
	virtualTokenReserves: bigint;
	virtualSolReserves: bigint;
	realTokenReserves: bigint;
	realSolReserves: bigint;
	tokenTotalSupply: bigint;
	complete: boolean;
};

export type PercentOfTokensToSellNonZero = 25 | 75 | 100;
