import { env } from "$/config/env";
import { type SerializedError, pino } from "pino";

/**
 * @description Custom function serialize an array of errors
 * @param errors
 * @returns SerializedError[]
 */
const errorsSerializer = (errors: Error[]): SerializedError[] => {
	if (!Array.isArray(errors)) {
		return errors;
	}
	return errors.map((error) => pino.stdSerializers.err(error));
};

/**
 * Custom Pino logger
 */
export const logger = pino({
	level: env.LOG_LEVEL,
	serializers: {
		error: pino.stdSerializers.err,
		errors: errorsSerializer,
		req: pino.stdSerializers.req,
		res: pino.stdSerializers.res,
	},
	timestamp: pino.stdTimeFunctions.isoTime,
	redact: {
		paths: ["req.headers.authorization"],
		censor: "**REDACTED**",
	},
	transport:
		// Pretty print in development
		env.NODE_ENV === "development"
			? {
					target: "pino-pretty",
					options: {
						colorize: true,
						colorizeObjects: true,
						ignore: "pid,hostname,env",
						levelFirst: true,
						translateTime: "SYS:HH:MM:ss.l",
					},
				}
			: undefined,
});
