import { getPriorityFeeEstimate } from "./methods/get-priority-fee-estimate";
import { getTokenHolders } from "./methods/get-token-holders";
import { sendSmartTransaction } from "./methods/send-smart-transaction";

export const heliusRpc = {
	getPriorityFeeEstimate,
	getTokenHolders,
	sendSmartTransaction,
} as const;
