import { env } from "$/config/env";
import { handleUnknownError } from "$/utils/handle-unknown-error";
import { logger } from "$/utils/logger";
import { sleep } from "bun";
import { type ResultAsync, fromPromise, fromThrowable } from "neverthrow";
import { handleWsMessage } from "./handlers/message";
import { sendPumpfunTransactionSubscribeRequest } from "./request";
import type { WebSocketMessage } from "./types";
import { closeWs } from "./utils/close-ws";

const PING_WS_INTERVAL = 60000; // 60 seconds

const startPingingWs = (ws: WebSocket): void => {
	const ping = async (): Promise<void> => {
		while (ws.readyState === WebSocket.OPEN) {
			ws.ping();
			await sleep(PING_WS_INTERVAL);
		}
	};

	ping().catch((error) => {
		logger.error({
			msg: "Failed to ping WebSocket",
			error,
		});
	});
};

export const startGeyserWs = (): ResultAsync<void, Error> => {
	return fromPromise(
		new Promise((resolve, reject) => {
			const ws = new WebSocket(env.HELIUS_ENHANCED_GEYSER_WS_URL);

			ws.onopen = () => {
				logger.info("WebSocket connection opened");
				sendPumpfunTransactionSubscribeRequest(ws);
				startPingingWs(ws);
				resolve();
			};

			ws.onclose = (event) => {
				logger.warn({
					msg: "WebSocket connection closed",
					code: event.code,
					reason: event.reason,
				});
			};

			ws.onerror = (event) => {
				reject(new Error(`WebSocket error: ${event}`));
			};

			ws.onmessage = (event) => {
				fromThrowable(
					() => JSON.parse(event.data) as WebSocketMessage,
					(error) => new Error("Failed to parse WebSocket message", { cause: handleUnknownError(error) }),
				)()
					.mapErr((error) => {
						logger.error({
							msg: "Failed to parse WebSocket message",
							error,
						});
					})
					.asyncAndThen((message) => handleWsMessage(ws, message, startGeyserWs))
					.mapErr((error) => {
						if (error instanceof Error) {
							closeWs(ws, "WebSocket message handler error");
							reject(new Error("Failed to handle WebSocket message", { cause: error }));
						}
					});
			};
		}),
		(error) => new Error("Geyser WebSocket failed", { cause: handleUnknownError(error) }),
	);
};
