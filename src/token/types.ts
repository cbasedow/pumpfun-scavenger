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
};
