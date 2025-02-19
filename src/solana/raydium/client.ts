import { WALLET_KEYPAIR } from "$/solana/wallet";
import { web3 } from "$/solana/web3";
import { Raydium } from "@raydium-io/raydium-sdk-v2";

export const client = await Raydium.load({
	connection: web3.connection,
	owner: WALLET_KEYPAIR,
	disableLoadToken: true,
});
