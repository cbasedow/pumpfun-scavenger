import { handleUnknownError } from "$/utils/handle-unknown-error";
import type { BlockhashWithExpiryBlockHeight } from "@solana/web3.js";
import { type ResultAsync, fromPromise } from "neverthrow";
import { connection } from "../connection";

export const getLatestBlockhash = (): ResultAsync<BlockhashWithExpiryBlockHeight, Error> => {
	return fromPromise(
		connection.getLatestBlockhash("confirmed"),
		(error) => new Error("Failed to get latest blockhash", { cause: handleUnknownError(error) }),
	);
};
