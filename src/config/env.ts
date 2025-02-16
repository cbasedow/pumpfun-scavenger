import * as v from "valibot";

const EnvSchema = v.object({
	NODE_ENV: v.optional(v.picklist(["development", "production"]), "development"),
	LOG_LEVEL: v.optional(v.picklist(["debug", "info"]), "info"),
	// Helius
	HELIUS_API_KEY: v.pipe(v.string(), v.minLength(1)),
	HELIUS_RPC_URL: v.pipe(v.string(), v.minLength(1)),
	HELIUS_ENHANCED_GEYSER_WS_URL: v.pipe(v.string(), v.minLength(1)),
	// Wallet
	WALLET_ADDRESS: v.pipe(v.string(), v.minLength(43)),
	WALLET_PRIVATE_KEY: v.pipe(v.string(), v.minLength(1)),
	// Upstash Redis
	UPSTASH_REDIS_REST_URL: v.pipe(v.string(), v.minLength(1)),
	UPSTASH_REDIS_REST_TOKEN: v.pipe(v.string(), v.minLength(1)),
});

type Env = v.InferOutput<typeof EnvSchema>;

const validateEnv = (): Env => {
	const parsedEnv = v.safeParse(EnvSchema, process.env);

	if (!parsedEnv.success) {
		const formattedIssues = parsedEnv.issues
			.map((issue) => `- ${issue.path?.map((p) => p.key)}: ${issue.message}`)
			.join("\n");

		throw new Error(`❌ Invalid environment variables:\n${formattedIssues}`);
	}

	return parsedEnv.output;
};

export const env = validateEnv();
