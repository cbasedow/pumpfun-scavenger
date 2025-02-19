export type BondingCurveState = {
	virtualTokenReserves: bigint;
	virtualSolReserves: bigint;
	realTokenReserves: bigint;
	realSolReserves: bigint;
	tokenTotalSupply: bigint;
	complete: boolean;
};
