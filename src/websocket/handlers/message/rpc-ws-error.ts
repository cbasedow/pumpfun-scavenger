import { logger } from "$/utils/logger";
import type { RpcWebSocketError, StartGeyserWs } from "$/websocket/types";
import { closeWs } from "$/websocket/utils/close-ws";
import { handleReconnect } from "$/websocket/utils/reconnect";
import { type ResultAsync, okAsync } from "neverthrow";

const RECOVERABLE_STATUS_CODES = new Set([
	-32005, // INTERNAL_ERROR
	-32603, // RATE_LIMIT_EXCEEDED
]);

export const handleRpcWsError = (
	ws: WebSocket,
	message: RpcWebSocketError,
	startWs: StartGeyserWs,
): ResultAsync<void, Error> => {
	logger.error({
		msg: "Received WebSocket RPC error message",
		message,
	});

	const { code, message: errorMessage } = message.error;

	if (RECOVERABLE_STATUS_CODES.has(code)) {
		logger.warn({
			msg: "Recoverable WebSocket RPC error, attempting to reconnect",
			code,
			errorMessage,
		});

		closeWs(ws, "recoverable RPC error");

		return handleReconnect(startWs).map(() => logger.info("Reconnected to WebSocket after recoverable RPC error"));
	}

	logger.error({
		msg: "Inrecoverable WebSocket RPC error, not attempting to reconnect",
		code,
		errorMessage,
	});

	closeWs(ws, "irrecoverable RPC error");

	return okAsync(undefined);
};
