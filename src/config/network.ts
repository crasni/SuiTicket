import { createNetworkConfig } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";

export const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl("testnet") },
  devnet: { url: getFullnodeUrl("devnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
});

export const DEFAULT_NETWORK = "testnet" as const;
export const DEFAULT_CHAIN = `sui:${DEFAULT_NETWORK}` as const;
