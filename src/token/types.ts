export type NewToken = {
	mintAddress: string;
	bondingCurveAddress: string;
	associatedBondingCurveAddress: string;
	mintTxnSignature: string;
	addedAt: number;
};

export type BoughtToken = {
	mintAddress: string;
	bondingCurveAddress: string;
	associatedBondingCurveAddress: string;
	txnSignature: string;
	boughtAt: number; // Timestamp of the bought token
	boughtAtMcapSolStr: string; // Market Cap in SOL of the bonding curve after buy (store as string to maintain precision)
	totalChecks: number; // Total number of checks the token has been checked
};
