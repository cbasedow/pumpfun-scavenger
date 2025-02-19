import { handleUnknownError } from "$/utils/handle-unknown-error";
import type { AccountInfo, PublicKey } from "@solana/web3.js";
import { type ResultAsync, fromPromise } from "neverthrow";
import { client } from "../client";

type ParsedTokenAccountInfo = {
	isNative: boolean;
	mint: string;
	owner: string;
	state: string;
	tokenAmount: {
		amount: string; // raw amount
		decimals: number;
		uiAmount: number; // deprecated
		uiAmountString: string;
	};
};

type ParsedHolderAccountData = {
	parsed: {
		info: ParsedTokenAccountInfo;
		type: "account";
	};
	program: "spl-token";
	space: 165;
};

// Override Solana Web3 AccountInfo Data type any with ParsedHolderAccountData since we know it's a token holder account
type TokenHolderAccount = {
	pubkey: PublicKey;
	account: AccountInfo<ParsedHolderAccountData>;
};

/**
 * Gets the token holders for a given token address
 * @param tokenAddress
 * @returns ResultAsync<ParsedTokenAccountInfo[], Error>
 */
export const getTokenHolders = (tokenAddress: string): ResultAsync<ParsedTokenAccountInfo[], Error> => {
	return fromPromise(
		client.rpc.getTokenHolders(tokenAddress) as Promise<TokenHolderAccount[]>,
		(error) => new Error("Failed to get token holders", { cause: handleUnknownError(error) }),
	).map((accounts) => {
		if (accounts.length === 0) {
			return [];
		}

		return accounts.map((acc) => acc.account.data.parsed.info);
	});
};
