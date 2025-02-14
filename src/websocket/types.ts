import type { ResultAsync } from "neverthrow";

export type TransactionNotification = {
	jsonrpc: "2.0";
	method: "transactionNotification";
	params: {
		subscription: number;
		result: {
			transaction: {
				transaction: {
					signatures: string[];
					message: {
						instructions: {
							programId: string;
							accounts: string[];
							data: string;
							stackHeight?: number | null;
						}[];
					};
				};
				meta: {
					logMessages: string[];
				};
			};
			signature: string;
			slot: number;
		};
	};
};

export type TransactionSubscribeError = {
	jsonrpc: "2.0";
	method: "transactionSubscribe";
	params: {
		subscription: number;
		error: string;
	};
};

export type RpcWebSocketSubscription = {
	jsonrpc: "2.0";
	result: number;
	id: number;
};

export type RpcWebSocketError = {
	jsonrpc: "2.0";
	error: {
		code: number;
		message: string;
		data?: unknown;
	};
};

export type WebSocketMessage =
	| TransactionNotification
	| TransactionSubscribeError
	| RpcWebSocketSubscription
	| RpcWebSocketError;

export type StartGeyserWs = () => ResultAsync<void, Error>;
