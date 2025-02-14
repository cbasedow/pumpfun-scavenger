import type {
	RpcWebSocketError,
	RpcWebSocketSubscription,
	TransactionNotification,
	TransactionSubscribeError,
	WebSocketMessage,
} from "./types";

export const isTransactionNotification = (message: WebSocketMessage): message is TransactionNotification => {
	return "method" in message && message.method === "transactionNotification" && "params" in message;
};

export const isTransactionSubscribeError = (message: WebSocketMessage): message is TransactionSubscribeError => {
	return (
		"method" in message && message.method === "transactionSubscribe" && "params" in message && "error" in message.params
	);
};

export const isWebSocketSubscription = (message: WebSocketMessage): message is RpcWebSocketSubscription => {
	return !("method" in message) && "result" in message && "id" in message;
};

export const isRpcWebSocketError = (message: WebSocketMessage): message is RpcWebSocketError => {
	return "error" in message && "code" in message.error;
};
