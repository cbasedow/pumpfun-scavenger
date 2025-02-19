import { pumpfun } from "$/solana/pumpfun";
import { type NewToken, newTokensStore } from "$/token";
import { bs58Decode } from "$/utils/bs58";
import { logger } from "$/utils/logger";
import type { TransactionNotification } from "$/websocket/types";
import { type ResultAsync, okAsync } from "neverthrow";

const PUMPFUN_PROGRAM_ID = pumpfun.PUMPFUN_PROGRAM_ID;
const PUMPFUN_CREATE_LOG = "Program log: Instruction: Create" as const;

const PUMPFUN_CREATE_STRUCT_CONFIG = {
	TYPE: 24,
	MINT_ADDRESS_INDEX: 0,
	DEV_ADDRESS_INDEX: 7,
	BONDING_CURVE_ADDRESS_INDEX: 2,
	ASSOCIATED_BONDING_CURVE_ADDRESS_INDEX: 3,
} as const;

export const handleTransactionNotification = (message: TransactionNotification): ResultAsync<void, Error> => {
	const result = message.params.result;
	const logs = result.transaction.meta.logMessages;
	const signature = result.signature;
	const instructions = result.transaction.transaction.message.instructions;

	if (!logs.some((log) => log === PUMPFUN_CREATE_LOG)) {
		return okAsync(undefined);
	}

	if (instructions.length === 0) {
		logger.debug({ result });
		logger.error({
			msg: "No instructions found in Pumpfun create log transaction",
			txnSignature: signature,
		});
		return okAsync(undefined);
	}

	for (const instruction of instructions) {
		const { accounts, data, programId } = instruction;

		if (programId !== PUMPFUN_PROGRAM_ID.toBase58()) {
			continue; // Not a pumpfun instruction
		}

		const decodedData = bs58Decode(data);

		if (decodedData.isErr()) {
			logger.warn({
				msg: `Failed to decode data for transaction ${signature} for create log ${PUMPFUN_CREATE_LOG}`,
				error: decodedData.error,
			});
			continue; // Failed to decode data
		}

		const buffer = Buffer.from(decodedData.value);

		if (buffer[0] !== PUMPFUN_CREATE_STRUCT_CONFIG.TYPE) {
			continue; // Not a create struct instruction
		}

		const mintAddress = accounts[PUMPFUN_CREATE_STRUCT_CONFIG.MINT_ADDRESS_INDEX];

		const newToken: NewToken = {
			mintAddress,
			bondingCurveAddress: accounts[PUMPFUN_CREATE_STRUCT_CONFIG.BONDING_CURVE_ADDRESS_INDEX],
			associatedBondingCurveAddress: accounts[PUMPFUN_CREATE_STRUCT_CONFIG.ASSOCIATED_BONDING_CURVE_ADDRESS_INDEX],
			mintTxnSignature: signature,
			addedAt: Date.now(),
		};

		return newTokensStore
			.addToken(newToken)
			.mapErr((error) => new Error(`Failed to add new token ${mintAddress} to the new tokens store: ${error.message}`))
			.map(() =>
				logger.debug({
					msg: `Added new token ${mintAddress} to the new tokens store`,
					newToken,
				}),
			);
	}

	logger.warn({
		msg: "No create struct instruction found in Pumpfun create log transaction",
		txnSignature: signature,
	});
	return okAsync(undefined);
};
