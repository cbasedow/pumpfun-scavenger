# pumpfun-scavenger

## About

This is an application that uses a Helius Geyser WebSocket to monitor for Pumpfun trading opportunities. It tracks new Pumpfun tokens in Redis by checking new tokens every minute that were created less than an hour ago. If the bonding curve is the only holder of the token, it will buy the token on Pumpfun. After buying the token, it will sell the token on Pumpfun or Raydium 15 minutes after the buy order is executed.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) - Follow the installation instructions at https://bun.sh/
- Solana Wallet - You'll need a wallet address and its private key

### Installation

1. Clone the repository
2. Install dependencies

```bash
bun install
```

3. Copy the `.env.example` file to `.env` and fill in the required environment variables:

```env
# Required environment variables
HELIUS_API_KEY=your_helius_api_key
HELIUS_RPC_URL=your_helius_rpc_url
HELIUS_ENHANCED_GEYSER_WS_URL=your_helius_geyser_websocket_url
WALLET_ADDRESS=your_wallet_address
WALLET_PRIVATE_KEY=your_wallet_private_key
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# Optional (defaults to "development")
NODE_ENV=development # production (set to production if you dont want pretty print logging)
LOG_LEVEL=info # debug (set to debug if you want more detailed logs)
```

4. Start the application

```bash
bun start
```

### Usage

When you start the application, you'll be prompted to enter three values:

1. **Min SOL Buy amount**: 
   - Enter the minimum amount of SOL you want to spend on each buy order
   - Must be a positive number
   - Example: `0.1`

2. **Buy Slippage Percentage**:
   - Enter your desired slippage tolerance for buy orders
   - Must be a number between 0 and 100
   - Example: `5 = 5%`

3. **Sell Slippage Percentage**:
   - Enter your desired slippage tolerance for sell orders
   - Must be a number between 0 and 100
   - Example: `5 = 5%`

After entering these values, the application will start monitoring for trading opportunities based on your settings.
