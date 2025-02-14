import { logger } from "$/utils/logger";
import type { StartGeyserWs, TransactionSubscribeError } from "$/websocket/types";
import { closeWs } from "$/websocket/utils/close-ws";
import { handleReconnect } from "$/websocket/utils/reconnect";
import type { ResultAsync } from "neverthrow";

export const handleTransactionSubscribeError = (
	ws: WebSocket,
	message: TransactionSubscribeError,
	startWs: StartGeyserWs,
): ResultAsync<void, Error> => {
	logger.error({
		msg: "Received WebSocket transaction subscribe error message",
		message,
	});

	closeWs(ws, "transaction subscribe error");

	return handleReconnect(startWs).map(() => logger.info("Reconnected to WebSocket after transaction subscribe error"));
};
