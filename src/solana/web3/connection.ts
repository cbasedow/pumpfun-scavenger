import { env } from "$/config/env";
import { Connection } from "@solana/web3.js";

export const connection = new Connection(env.HELIUS_RPC_URL, "confirmed");
