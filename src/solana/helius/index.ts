import { getLatestBlockhash } from "./methods/get-latest-blockhash";
import { getPriorityFeeEstimate } from "./methods/get-priority-fee-estimate";
import { getTokenHolders } from "./methods/get-token-holders";
import { sendTransaction } from "./methods/send-transaction";

export const helius = {
	getLatestBlockhash,
	getPriorityFeeEstimate,
	getTokenHolders,
	sendTransaction,
} as const;
