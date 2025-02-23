import { env } from "$/config/env";
import { RpcClient } from "helius-sdk";
import { web3 } from "../web3";

export const rpcClient = new RpcClient(web3.connection, env.HELIUS_API_KEY);
