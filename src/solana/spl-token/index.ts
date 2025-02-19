import { getAssociatedTokenPubkey } from "./utils/get-associated-token-pubkey";
import { getTokenAccount } from "./utils/get-token-account";

export const splToken = {
	getAssociatedTokenPubkey,
	getTokenAccount,
} as const;
