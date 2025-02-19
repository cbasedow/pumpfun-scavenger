import { connection } from "./connection";
import { getAccountInfo } from "./methods/get-account-info";
import { sendTransactionWithRetries } from "./utils/send-transaction-with-retries";

export const solanaRpc = {
	connection,
	getAccountInfo,
	sendTransactionWithRetries,
} as const;
