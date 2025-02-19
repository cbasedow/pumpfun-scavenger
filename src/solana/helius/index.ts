import { getPriorityFeeEstimate } from "./methods/get-priority-fee-estimate";
import { getTokenHolders } from "./methods/get-token-holders";

export const helius = {
	getPriorityFeeEstimate,
	getTokenHolders,
} as const;
