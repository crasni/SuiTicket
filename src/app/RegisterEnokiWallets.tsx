import { useEffect } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { registerEnokiWallets } from "@mysten/enoki";
import { DEFAULT_NETWORK } from "../config/network";

/**
 * Registers Enoki zkLogin wallets (Google, etc.) into the Wallet Standard registry
 * so <ConnectButton /> can display them.
 *
 * This component renders nothing.
 */
export default function RegisterEnokiWallets() {
  const client = useSuiClient();

  useEffect(() => {
    const apiKey = import.meta.env.VITE_ENOKI_API_KEY as string | undefined;
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as
      | string
      | undefined;

    // Don't crash the app if env vars aren't set yet.
    if (!apiKey || !googleClientId) {
      console.warn(
        "[enoki] Missing env vars. Set VITE_ENOKI_API_KEY and VITE_GOOGLE_CLIENT_ID to enable zkLogin.",
      );
      return;
    }

    const { unregister } = registerEnokiWallets({
      apiKey,
      client,
      network:
        (import.meta.env.VITE_SUI_NETWORK as
          | "mainnet"
          | "testnet"
          | "devnet"
          | undefined) ?? DEFAULT_NETWORK,
      providers: {
        google: {
          clientId: googleClientId,
          // Must match Google OAuth Authorized redirect URI:
          redirectUrl: `${window.location.origin}/auth`,
        },
      },
    });

    return unregister;
  }, [client]);

  return null;
}
