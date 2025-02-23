import { handleUnknownError } from "$/utils/handle-unknown-error";
import type { GetPriorityFeeEstimateRequest, GetPriorityFeeEstimateResponse } from "helius-sdk";
import { type ResultAsync, fromPromise } from "neverthrow";
import { rpcClient } from "../client";

/**
 * Gets the priority fee estimate
 * @param params GetPriorityFeeEstimateRequest
 * @returns ResultAsync<GetPriorityFeeEstimateResponse, Error>
 */
export const getPriorityFeeEstimate = (
	params: GetPriorityFeeEstimateRequest,
): ResultAsync<GetPriorityFeeEstimateResponse, Error> => {
	return fromPromise(
		rpcClient.getPriorityFeeEstimate(params),
		(error) => new Error("Failed to get priority fee estimate", { cause: handleUnknownError(error) }),
	);
};
