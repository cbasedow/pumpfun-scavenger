import { env } from "$/config/env";
import { Helius } from "helius-sdk";

export const helius = new Helius(env.HELIUS_API_KEY);
