import { connection } from "./connection";
import { getAccountInfo } from "./methods/get-account-info";
import { sendTransactionWithRetries } from "./utils/send-transaction-with-retries";

export const web3 = {
	connection,
	getAccountInfo,
	sendTransactionWithRetries,
} as const;
