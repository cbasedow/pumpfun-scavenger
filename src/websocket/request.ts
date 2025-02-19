import { pumpfun } from "$/solana/pumpfun";

const PUMPFUN_TRANSACTION_SUBSCRIBE_REQUEST = {
	jsonrpc: "2.0",
	id: Math.floor(Math.random() * 10000),
	method: "transactionSubscribe",
	params: [
		{
			failed: false,
			vote: false,
			accountInclude: [pumpfun.PUMPFUN_PROGRAM_ID],
		},
		{
			commitment: "confirmed",
			encoding: "jsonParsed",
			transactionDetails: "full",
			maxSupportedTransactionVersion: 0,
		},
	],
} as const;

/**
 * Sends a transaction subscribe request to the websocket for the Pumpfun program
 * @param ws WebSocket
 */
export const sendPumpfunTransactionSubscribeRequest = (ws: WebSocket) => {
	ws.send(JSON.stringify(PUMPFUN_TRANSACTION_SUBSCRIBE_REQUEST));
};
