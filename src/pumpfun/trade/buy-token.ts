import { WALLET_KEYPAIR, WALLET_PUBKEY } from "$/config/wallet";
import { solanaRpc } from "$/solana-rpc";
import { splToken } from "$/spl-token";
import { handleUnknownError } from "$/utils/handle-unknown-error";
import { u64 } from "$/utils/solana-buffer-layout";
import { struct } from "@solana/buffer-layout";
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import {
	type AccountMeta,
	type PublicKey,
	SYSVAR_RENT_PUBKEY,
	SystemProgram,
	type TransactionInstruction,
} from "@solana/web3.js";
import { type Result, type ResultAsync, fromThrowable } from "neverthrow";
import { PUMPFUN_EVENT_AUTHORITY, PUMPFUN_FEE_ACCOUNT, PUMPFUN_GLOBAL_ACCOUNT, PUMPFUN_PROGRAM_ID } from "../constants";
import type { BondingCurveState } from "../types";

type BuyInstructionArgs = {
	amount: bigint;
	maxSolCost: bigint;
};

const BUY_INSTRUCTION_STRUCT = struct<BuyInstructionArgs>([u64("amount"), u64("maxSolCost")]);
const BUY_DISCRIMINATOR = [102, 6, 61, 18, 1, 218, 235, 234] as const;
const BUY_DISCRIMINATOR_SIZE = 8 as const;
const BUY_BUFFER_SIZE = 24 as const;

type BuyTokenParams = {
	mintPubkey: PublicKey;
	bondingCurvePubkey: PublicKey;
	associatedBondingCurvePubkey: PublicKey;
	bondingCurveState: BondingCurveState;
	minSolBuyAmount: bigint;
	buySlippagePct: number;
};

/**
 * Buys a Pumpfun token
 * @param params.mintPubkey Public Key of token mint account
 * @param params.bondingCurvePubkey Public key of the Pumpfun bonding curve account
 * @param params.associatedBondingCurvePubkey Public key of the Pumpfun associated bonding curve account
 * @param params.bondingCurveState Decoded Pumpfun bonding curve state
 * @param params.solBuyAmount minimum amount of SOL to spend on the buy
 * @param params.buySlippagePct Slippage percentage to use for the buy
 * @returns ResultAsync<string (transaction signature), Error>
 */
export const buyToken = (params: BuyTokenParams): ResultAsync<string, Error> => {
	const {
		mintPubkey,
		bondingCurvePubkey,
		associatedBondingCurvePubkey,
		bondingCurveState,
		minSolBuyAmount,
		buySlippagePct,
	} = params;

	return calculateBuyInstructionArgs(bondingCurveState, minSolBuyAmount, buySlippagePct)
		.asyncAndThen(({ amount, maxSolCost }) => {
			const buyInstructionData = Buffer.alloc(BUY_BUFFER_SIZE);
			buyInstructionData.set(BUY_DISCRIMINATOR, 0);
			BUY_INSTRUCTION_STRUCT.encode(
				{
					amount,
					maxSolCost,
				},
				buyInstructionData,
				BUY_DISCRIMINATOR_SIZE,
			);

			return splToken.getAssociatedTokenPubkey(mintPubkey, WALLET_PUBKEY).asyncAndThen((ataPubkey) => {
				return splToken.getTokenAccount(ataPubkey).andThen((ataTokenAccount) => {
					const instructions: TransactionInstruction[] = [];

					if (!ataTokenAccount) {
						instructions.push(
							createAssociatedTokenAccountInstruction(WALLET_PUBKEY, ataPubkey, WALLET_PUBKEY, mintPubkey),
						);
					}

					instructions.push(
						createBuyInstruction({
							mintPubkey,
							bondingCurvePubkey,
							associatedBondingCurvePubkey,
							ataPubkey,
							buyInstructionData,
						}),
					);
					return solanaRpc.sendTransactionWithRetries(instructions, [WALLET_KEYPAIR]);
				});
			});
		})
		.mapErr((error) => new Error(`Failed to buy Pumpfun token: ${error.message}`));
};

/**
 * @description Calculates the arguments for the Pumpfun buy instruction
 * @param bondingCurveState Decoded Pumpfun bonding curve state
 * @param minSolBuyAmount Minimum amount of SOL to spend on the buy
 * @param buySlippagePct Slippage percent to use for the buy
 * @returns Result<BuyInstructionArgs, Error>
 */
const calculateBuyInstructionArgs = (
	bondingCurveState: BondingCurveState,
	minSolBuyAmount: bigint,
	buySlippagePct: number,
): Result<BuyInstructionArgs, Error> => {
	const { virtualSolReserves, virtualTokenReserves } = bondingCurveState;

	return fromThrowable(
		() => {
			const k = virtualSolReserves * virtualTokenReserves; // Constant product formula

			const newSolReserves = virtualSolReserves + minSolBuyAmount; // New virtual sol reserves after purchase
			const newTokenReserves = BigInt(k / newSolReserves) + 1n; // New virtual token reserves after purchase

			const buyTokenAmount = virtualTokenReserves - newTokenReserves; // Amount of tokens to buy

			const maxSolCost = minSolBuyAmount + (minSolBuyAmount * BigInt(buySlippagePct)) / 100n; // Max sol cost

			return {
				amount: buyTokenAmount,
				maxSolCost,
			};
		},
		(error) => new Error(`Failed to calculate Pumpfun buy instruction args: ${handleUnknownError(error).message}`),
	)();
};

type CreateBuyInstructionParams = {
	mintPubkey: PublicKey;
	bondingCurvePubkey: PublicKey;
	associatedBondingCurvePubkey: PublicKey;
	ataPubkey: PublicKey;
	buyInstructionData: Buffer;
};

/**
 * @description Creates a Pumpfun buy instruction
 * @param params.mintPubkey Public key of the token mint account
 * @param params.bondingCurvePubkey Public key of the Pumpfun bonding curve account
 * @param params.associatedBondingCurvePubkey Public key of the Pumpfun associated bonding curve account
 * @param params.ataPubkey Public key of the associated token account
 * @param params.buyInstructionData Instruction data for the Pumpfun buy instruction
 * @returns TransactionInstruction
 */
const createBuyInstruction = (params: CreateBuyInstructionParams): TransactionInstruction => {
	const { mintPubkey, bondingCurvePubkey, associatedBondingCurvePubkey, ataPubkey, buyInstructionData } = params;

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
		// 8. Token Program
		{
			pubkey: TOKEN_PROGRAM_ID,
			isSigner: false,
			isWritable: false,
		},
		// 9. Rent Program
		{
			pubkey: SYSVAR_RENT_PUBKEY,
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

	const buyInstruction: TransactionInstruction = {
		keys: structKeys,
		programId: PUMPFUN_PROGRAM_ID,
		data: buyInstructionData,
	};

	return buyInstruction;
};
