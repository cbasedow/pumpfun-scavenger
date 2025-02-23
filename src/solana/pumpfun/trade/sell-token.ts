import { splToken } from "$/solana/spl-token";
import { sendTransactionWithRetries } from "$/solana/utils/send-transaction-with-retries";
import { WALLET_KEYPAIR, WALLET_PUBKEY } from "$/solana/wallet";
import { handleUnknownError } from "$/utils/handle-unknown-error";
import { u64 } from "$/utils/solana-buffer-layout";
import { struct } from "@solana/buffer-layout";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { type AccountMeta, type PublicKey, SystemProgram, type TransactionInstruction } from "@solana/web3.js";
import { type Result, type ResultAsync, errAsync, fromThrowable } from "neverthrow";
import { PUMPFUN_EVENT_AUTHORITY, PUMPFUN_FEE_ACCOUNT, PUMPFUN_GLOBAL_ACCOUNT, PUMPFUN_PROGRAM_ID } from "../constants";
import type { BondingCurveState, PercentOfTokensToSellNonZero } from "../types";

type SellInstructionArgs = {
	amount: bigint;
	minSolOutput: bigint;
};

const SELL_INSTRUCTION_STRUCT = struct<SellInstructionArgs>([u64("amount"), u64("minSolOutput")]);

const SELL_DISCRIMINATOR = [51, 230, 133, 164, 1, 127, 131, 173] as const;
const SELL_DISCRIMINATOR_SIZE = 8 as const;
const SELL_BUFFER_SIZE = 24 as const;

type SellTokenParams = {
	mintPubkey: PublicKey;
	bondingCurvePubkey: PublicKey;
	associatedBondingCurvePubkey: PublicKey;
	bondingCurveState: BondingCurveState;
	sellSlippagePct: number;
	percentOfTokensToSell: PercentOfTokensToSellNonZero;
};

/**
 * Sells a Pumpfun token
 * @param params.mintPubkey Public Key of token mint account
 * @param params.bondingCurvePubkey Public key of the Pumpfun bonding curve account
 * @param params.associatedBondingCurvePubkey Public key of the Pumpfun associated bonding curve account
 * @param params.bondingCurveState Decoded Pumpfun bonding curve state
 * @param params.sellSlippagePct Slippage percentage to use for the sell
 * @returns ResultAsync<string(transaction signature), HeliusRpcError, SplTokenError, PumpfunError, Error>
 */
export const sellToken = (params: SellTokenParams): ResultAsync<string, Error> => {
	const {
		mintPubkey,
		bondingCurvePubkey,
		associatedBondingCurvePubkey,
		bondingCurveState,
		sellSlippagePct,
		percentOfTokensToSell,
	} = params;

	return splToken
		.getAssociatedTokenPubkey(mintPubkey, WALLET_PUBKEY)
		.asyncAndThen((ataPubkey) => {
			return splToken.getTokenAccount(ataPubkey).andThen((ataTokenAccount) => {
				if (!ataTokenAccount) {
					return errAsync(new Error("Token account not found"));
				}

				const tokenAmountHeld = ataTokenAccount.amount;

				if (tokenAmountHeld === 0n) {
					return errAsync(new Error("No tokens held"));
				}

				return calculateMinSolOutput(
					bondingCurveState,
					tokenAmountHeld,
					sellSlippagePct,
					percentOfTokensToSell,
				).asyncAndThen((minSolOutput) => {
					const sellInstructionData = Buffer.alloc(SELL_BUFFER_SIZE);
					sellInstructionData.set(SELL_DISCRIMINATOR, 0);
					SELL_INSTRUCTION_STRUCT.encode(
						{
							amount: tokenAmountHeld,
							minSolOutput,
						},
						sellInstructionData,
						SELL_DISCRIMINATOR_SIZE,
					);

					const sellInstruction = createSellInstruction({
						mintPubkey,
						bondingCurvePubkey,
						associatedBondingCurvePubkey,
						ataPubkey,
						sellInstructionData,
					});

					return sendTransactionWithRetries({
						instructions: [sellInstruction],
						signers: [WALLET_KEYPAIR],
						sendOptions: {
							skipPreflight: true,
							maxRetries: 0,
							preflightCommitment: "confirmed",
						},
					});
				});
			});
		})
		.mapErr((error) => new Error("Failed to sell Pumpfun token", { cause: error }));
};

/**
 * Calculates the minimum amount of SOL to receive for a given amount of token
 * @param bondingCurveState Decoded Pumpfun bonding curve state
 * @param tokenAmountHeld Amount of tokens held by our associated token account
 * @param sellSlippagePct Sell slippage percentage
 * @param percentOfTokensToSell Percent of tokens to sell
 * @returns Result<bigint, Error>
 */
const calculateMinSolOutput = (
	bondingCurveState: BondingCurveState,
	tokenAmountHeld: bigint,
	sellSlippagePct: number,
	percentOfTokensToSell: PercentOfTokensToSellNonZero,
): Result<bigint, Error> => {
	const { virtualSolReserves, virtualTokenReserves } = bondingCurveState;
	return fromThrowable(
		() => {
			const k = virtualSolReserves * virtualTokenReserves; // Constant product formula

			const tokensToSell = (tokenAmountHeld * BigInt(percentOfTokensToSell)) / 100n; // Amount of tokens to sell

			const newTokenReservers = virtualTokenReserves + tokensToSell; // New virtual token reserves after sell
			const newSolReserves = BigInt(k / newTokenReservers) + 1n; // New virtual sol reserves after sell

			const solOutput = virtualSolReserves - newSolReserves; // Amount of sol to sell

			const minSolOutput = solOutput - (solOutput * BigInt(sellSlippagePct)) / 100n; // Min sol output

			return minSolOutput;
		},
		(error) => new Error("Failed to calculate minSolOutput", { cause: handleUnknownError(error) }),
	)();
};

type CreateSellInstructionParams = {
	mintPubkey: PublicKey;
	bondingCurvePubkey: PublicKey;
	associatedBondingCurvePubkey: PublicKey;
	ataPubkey: PublicKey;
	sellInstructionData: Buffer;
};

/**
 * Creates a Pumpfun sell instruction
 * @param params.mintPubkey Public key of the token mint account
 * @param params.bondingCurvePubkey Public key of the Pumpfun bonding curve account
 * @param params.associatedBondingCurvePubkey Public key of the Pumpfun associated bonding curve account
 * @param params.ataPubkey Public key of the associated token account
 * @param params.sellInstructionData Instruction data for the Pumpfun sell instruction
 * @returns TransactionInstruction
 */
const createSellInstruction = (params: CreateSellInstructionParams): TransactionInstruction => {
	const { mintPubkey, bondingCurvePubkey, associatedBondingCurvePubkey, ataPubkey, sellInstructionData } = params;

	const structKeys: AccountMeta[] = [
		// 0. Pumpfun global account
		{
			pubkey: PUMPFUN_GLOBAL_ACCOUNT,
			isSigner: false,
			isWritable: false,
		},
		// 1. Pumpfun fee account
		{
			pubkey: PUMPFUN_FEE_ACCOUNT,
			isSigner: false,
			isWritable: true,
		},
		// 2. Mint
		{
			pubkey: mintPubkey,
			isSigner: false,
			isWritable: false,
		},
		// 3. Bonding curve
		{
			pubkey: bondingCurvePubkey,
			isSigner: false,
			isWritable: true,
		},
		// 4. Associated bonding curve
		{
			pubkey: associatedBondingCurvePubkey,
			isSigner: false,
			isWritable: true,
		},
		// 5. Associated token account
		{
			pubkey: ataPubkey,
			isSigner: false,
			isWritable: true,
		},
		// 6. User (our provided Wallet Pubkey)
		{
			pubkey: WALLET_PUBKEY,
			isSigner: true,
			isWritable: true,
		},
		// 7. System Program
		{
			pubkey: SystemProgram.programId,
			isSigner: false,
			isWritable: false,
		},
		// 8. Associated Token program
		{
			pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
			isSigner: false,
			isWritable: false,
		},
		// 9. Token program
		{
			pubkey: TOKEN_PROGRAM_ID,
			isSigner: false,
			isWritable: false,
		},
		// 10. Pumpfun Event Authority
		{
			pubkey: PUMPFUN_EVENT_AUTHORITY,
			isSigner: false,
			isWritable: false,
		},
		// 11. Pumpfun Program ID
		{
			pubkey: PUMPFUN_PROGRAM_ID,
			isSigner: false,
			isWritable: false,
		},
	];

	const sellInstruction: TransactionInstruction = {
		keys: structKeys,
		programId: PUMPFUN_PROGRAM_ID,
		data: sellInstructionData,
	};

	return sellInstruction;
};
