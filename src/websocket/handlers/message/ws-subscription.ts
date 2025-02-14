import { logger } from "$/utils/logger";
import type { RpcWebSocketSubscription } from "$/websocket/types";
import { type ResultAsync, okAsync } from "neverthrow";

export const handleWsSubscriptionMessage = (message: RpcWebSocketSubscription): ResultAsync<void, never> => {
	logger.info({
		msg: "Received WebSocket subscription message",
		message,
	});

	return okAsync(undefined);
};
