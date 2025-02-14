import { bs58Decode } from "$/utils/bs58";
import { createKeyPairFromSecretKey } from "$/utils/keypair";
import { createPubkey } from "$/utils/public-key";
import { env } from "./env";

const walletPubKeyResult = createPubkey(env.WALLET_ADDRESS);

if (walletPubKeyResult.isErr()) {
	throw new Error(`Failed to create PublicKey from wallet address: ${walletPubKeyResult.error.message}`);
}

export const WALLET_PUBKEY = walletPubKeyResult.value;

const walletKeyPairResult = bs58Decode(env.WALLET_PRIVATE_KEY).andThen(createKeyPairFromSecretKey);

if (walletKeyPairResult.isErr()) {
	throw new Error(`Failed to create Keypair from wallet private key: ${walletKeyPairResult.error.message}`);
}

export const WALLET_KEYPAIR = walletKeyPairResult.value;
