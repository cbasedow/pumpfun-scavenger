import {
	isRpcWebSocketError,
	isTransactionNotification,
	isTransactionSubscribeError,
	isWebSocketSubscription,
} from "$/websocket/helpers";
import type { StartGeyserWs, WebSocketMessage } from "$/websocket/types";
import { type ResultAsync, okAsync } from "neverthrow";
import { handleRpcWsError } from "./rpc-ws-error";
import { handleTransactionNotification } from "./transaction-notification";
import { handleTransactionSubscribeError } from "./transaction-subscribe-error";
import { handleWsSubscriptionMessage } from "./ws-subscription";

export const handleWsMessage = (
	ws: WebSocket,
	message: WebSocketMessage,
	startWs: StartGeyserWs,
): ResultAsync<void, Error> | ResultAsync<void, never> => {
	if (isTransactionNotification(message)) {
		return handleTransactionNotification(message);
	}

	if (isWebSocketSubscription(message)) {
		return handleWsSubscriptionMessage(message);
	}

	if (isTransactionSubscribeError(message)) {
		return handleTransactionSubscribeError(ws, message, startWs);
	}

	if (isRpcWebSocketError(message)) {
		return handleRpcWsError(ws, message, startWs);
	}

	return okAsync(undefined);
};
