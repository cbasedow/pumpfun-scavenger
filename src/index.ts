import * as p from "@clack/prompts";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { type Result, type ResultAsync, fromPromise, fromThrowable } from "neverthrow";
import { startTokenTracker } from "./token";
import { handleUnknownError } from "./utils/handle-unknown-error";
import { logger } from "./utils/logger";
import { startGeyserWs } from "./websocket";

type RawInputs = {
	minSolBuyAmountStr: string;
	buySlippagePctStr: string;
	sellSlippagePctStr: string;
};

type Inputs = {
	minSolBuyAmount: bigint;
	buySlippagePct: number;
	sellSlippagePct: number;
};

const collectRawInputs = (): ResultAsync<RawInputs, Error> => {
	return fromPromise(
		p.group(
			{
				minSolBuyAmountStr: () => {
					return p.text({
						message: "Enter the amount of SOL you'd like purchase on each buy (e.g. 0.1):",
						validate: (value) => {
							if (!value) return "Value is required";
							const valueNumber = Number.parseFloat(value);
							if (valueNumber < 0) return "Value must be greater than 0";
						},
					});
				},
				buySlippagePctStr: () => {
					return p.text({
						message: "Enter the buy slippage percentage(e.g. 5 for 5%):",
						validate: (value) => {
							if (!value) return "Value is required";
							const valueNumber = Number.parseFloat(value);
							if (valueNumber < 0 || valueNumber > 100) return "Value must be between 0 and 100";
						},
					});
				},
				sellSlippagePctStr: () => {
					return p.text({
						message: "Enter the sell slippage percentage(e.g. 5 for 5%):",
						validate: (value) => {
							if (!value) return "Value is required";
							const valueNumber = Number.parseFloat(value);
							if (valueNumber < 0 || valueNumber > 100) return "Value must be between 0 and 100";
						},
					});
				},
			},
			{
				onCancel: () => {
					p.cancel("Input operation canceled");
					process.exit(0);
				},
			},
		),
		(error) => new Error(`Failed to collect raw inputs: ${handleUnknownError(error).message}`),
	);
};

const transformRawInputs = (rawInputs: RawInputs): Result<Inputs, Error> => {
	const { minSolBuyAmountStr, buySlippagePctStr, sellSlippagePctStr } = rawInputs;

	return fromThrowable(
		() => {
			const minSolBuyAmount = BigInt(Number.parseFloat(minSolBuyAmountStr) * LAMPORTS_PER_SOL);
			const buySlippagePct = Number.parseFloat(buySlippagePctStr);
			const sellSlippagePct = Number.parseFloat(sellSlippagePctStr);

			return {
				minSolBuyAmount,
				buySlippagePct,
				sellSlippagePct,
			};
		},
		(error) => new Error(`Failed to transform raw inputs: ${handleUnknownError(error).message}`),
	)();
};

const main = (): ResultAsync<void, Error> => {
	return collectRawInputs()
		.andThen(transformRawInputs)
		.andThen(({ minSolBuyAmount, buySlippagePct, sellSlippagePct }) => {
			logger.info({
				msg: "Initializing Pumpfun sniper with the following inputs:",
				minSolBuyAmount,
				buySlippagePct,
				sellSlippagePct,
			});

			return startGeyserWs().andThen(() => {
				logger.info("Successfully started Geyser WebSocket");
				return startTokenTracker(minSolBuyAmount, buySlippagePct, sellSlippagePct).map(() =>
					logger.info("Successfully started token tracking"),
				);
			});
		});
};

await main().mapErr((error) => {
	logger.error({
		msg: "Fatal error in main process!",
		error,
	});
	process.exit(1);
});

// Handle uncaught errors
process.on("uncaughtException", (error) => {
	logger.error({
		msg: "Uncaught exception",
		error,
	});
	process.exit(1);
});

process.on("unhandledRejection", (reason) => {
	logger.error({
		msg: "Unhandled rejection",
		error: reason,
	});
	process.exit(1);
});

// Handle shutdown gracefully
process.on("SIGINT", () => {
	logger.info("Received SIGINT. Shutting down...");
	process.exit(0);
});

process.on("SIGTERM", () => {
	logger.info("Received SIGTERM. Shutting down...");
	process.exit(0);
});
