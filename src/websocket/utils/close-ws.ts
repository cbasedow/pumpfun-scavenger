import { logger } from "$/utils/logger";

export const closeWs = (ws: WebSocket, context?: string): void => {
	if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
		ws.close();
		logger.warn(`Closed WebSocket connection due to ${context || "unknown"} error`);
	}
};
