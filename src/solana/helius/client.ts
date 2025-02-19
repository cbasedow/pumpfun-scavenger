import { env } from "$/config/env";
import { Helius } from "helius-sdk";

export const client = new Helius(env.HELIUS_API_KEY);
