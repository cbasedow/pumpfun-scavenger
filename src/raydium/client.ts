import { WALLET_KEYPAIR } from "$/config/wallet";
import { solanaRpc } from "$/solana-rpc";
import { Raydium } from "@raydium-io/raydium-sdk-v2";

export const raydium = await Raydium.load({
	connection: solanaRpc.connection,
	owner: WALLET_KEYPAIR,
	disableLoadToken: true,
});
