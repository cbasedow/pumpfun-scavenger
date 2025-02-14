import { connection } from "./connection";
import { getAccountInfo } from "./methods/get-account-info";

export const solanaRpc = {
	connection,
	getAccountInfo,
} as const;
