import { WALLET_PUBKEY } from "$/config/wallet";
import { heliusRpc } from "$/helius";
import { splToken } from "$/spl-token";
import { TxVersion } from "@raydium-io/raydium-sdk-v2";
import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { PriorityLevel } from "helius-sdk";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { computeAmountOut } from "../methods/compute-amount-out";
import { executeSwap } from "../methods/execute-swap";
import { getAmmPoolInfoByMint } from "../methods/get-amm-pool-info";
import { getAmmPoolKeys } from "../methods/get-amm-pool-keys";
import { getAmmRpcPoolData } from "../methods/get-amm-rpc-pool-data";

const DEFAULT_COMPUTE_UNITS = 200_000 as const;
const DEFAULT_MICRO_LAMPORTS = 50_000 as const;

export const sellToken = (mintPubkey: PublicKey, sellSlippagePct: number): ResultAsync<string, Error> => {
	return ResultAsync.combine([getAmmPoolInfoByMint(mintPubkey), getTokenAmountHeldBN(mintPubkey)]).andThen(
		([poolInfo, tokenAmountHeldBN]) => {
			const poolId = poolInfo.id;

			return ResultAsync.combine([getAmmPoolKeys(poolId), getAmmRpcPoolData(poolId)]).andThen(
				([ammPoolKeys, ammRpcPoolData]) => {
					const [baseReserve, quoteReserve, status] = [
						ammRpcPoolData.baseReserve,
						ammRpcPoolData.quoteReserve,
						ammRpcPoolData.status.toNumber(),
					];

					const baseIn = mintPubkey.toBase58() === poolInfo.mintA.address;
					const [mintIn, mintOut] = baseIn ? [poolInfo.mintA, poolInfo.mintB] : [poolInfo.mintB, poolInfo.mintA];

					return computeAmountOut({
						poolInfo: {
							...poolInfo,
							baseReserve,
							quoteReserve,
							status,
							version: 4,
						},
						amountIn: tokenAmountHeldBN,
						mintIn: mintIn.address,
						mintOut: mintOut.address,
						slippage: sellSlippagePct / 100,
					}).asyncAndThen(({ amountOut }) => {
						return getComputeBudgetConfig().andThen((computeBudgetConfig) => {
							return executeSwap({
								poolInfo,
								poolKeys: ammPoolKeys,
								amountIn: tokenAmountHeldBN,
								amountOut,
								fixedSide: "in",
								inputMint: mintIn.address,
								txVersion: TxVersion.V0,
								computeBudgetConfig,
							});
						});
					});
				},
			);
		},
	);
};

const getTokenAmountHeldBN = (mintPubkey: PublicKey): ResultAsync<BN, Error> => {
	return splToken
		.getAssociatedTokenPubkey(mintPubkey, WALLET_PUBKEY)
		.asyncAndThen(splToken.getTokenAccount)
		.andThen((ataTokenAccount) => {
			if (!ataTokenAccount) {
				return errAsync(new Error("Token account not found"));
			}

			const tokenAmountHeld = ataTokenAccount.amount;
			if (tokenAmountHeld === 0n) {
				return errAsync(new Error("No tokens held"));
			}
			return okAsync(new BN(tokenAmountHeld.toString()));
		})
		.mapErr((error) => new Error("Failed to get token amount held BN", { cause: error }));
};

type ComputeBudgetConfig = {
	units: number;
	microLamports: number;
};

const getComputeBudgetConfig = (): ResultAsync<ComputeBudgetConfig, Error> => {
	return heliusRpc
		.getPriorityFeeEstimate({
			options: {
				priorityLevel: PriorityLevel.LOW,
				lookbackSlots: 5,
				recommended: true,
			},
		})
		.map((data) => {
			return {
				units: DEFAULT_COMPUTE_UNITS,
				microLamports: data.priorityFeeEstimate ?? DEFAULT_MICRO_LAMPORTS,
			};
		})
		.mapErr((error) => new Error("Failed to get compute budget config", { cause: error }));
};
