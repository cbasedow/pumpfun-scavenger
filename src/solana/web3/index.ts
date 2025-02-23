import { connection } from "./connection";
import { confirmTransaction } from "./methods/confirm-transaction";
import { getAccountInfo } from "./methods/get-account-info";
import { simulateVersionedTransaction } from "./methods/simulate-versioned-transaction";

export const web3 = {
	connection,
	confirmTransaction,
	getAccountInfo,
	simulateVersionedTransaction,
} as const;
