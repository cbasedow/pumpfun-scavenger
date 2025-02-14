import { logger } from "$/utils/logger";
import { sleepMs } from "$/utils/sleep";
import { type ResultAsync, errAsync } from "neverthrow";
import type { StartGeyserWs } from "../types";

const MAX_RECONNECT_ATTEMPTS = 5; // Max 5 reconnect attempts
const BASE_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

export const handleReconnect = (startWs: StartGeyserWs): ResultAsync<void, Error> => {
	const attemptReconnect = (attempts: number): ResultAsync<void, Error> => {
		if (attempts >= MAX_RECONNECT_ATTEMPTS) {
			return errAsync(new Error("Maximum reconnect attempts reached"));
		}

		const reconnectDelay = getReconnectDelay(attempts);
		logger.info({
			msg: `Reconnecting to WebSocket in ${reconnectDelay / 1000} seconds`,
			attempts: attempts + 1,
		});

		return sleepMs(reconnectDelay)
			.andThen(() => startWs())
			.orElse(() => attemptReconnect(attempts + 1));
	};

	return attemptReconnect(0);
};

const getReconnectDelay = (attempts: number): number => {
	return Math.min(BASE_RECONNECT_DELAY * 2 ** (attempts - 1), MAX_RECONNECT_DELAY);
};
