import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flex, Text } from "@radix-ui/themes";
import { EnokiFlow } from "@mysten/enoki";

/**
 * OAuth redirect landing page.
 *
 * After Google finishes, it redirects back here (e.g. /auth#id_token=...).
 * We ask EnokiFlow to finalize the session, then send the user back home.
 *
 * (EnokiFlow is marked deprecated in the SDK, but it's still the simplest way
 * to handle the redirect in a SPA. The session it stores is what Enoki wallets use.)
 */
export default function Auth() {
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_ENOKI_API_KEY as string | undefined;
    if (!apiKey) {
      setError("Missing VITE_ENOKI_API_KEY.");
      return;
    }

    const flow = new EnokiFlow({ apiKey });

    flow
      .handleAuthCallback()
      .then(() => nav("/", { replace: true }))
      .catch((e) => {
        console.error("[enoki] handleAuthCallback failed:", e);
        setError(e instanceof Error ? e.message : String(e));
      });
  }, [nav]);

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      style={{ minHeight: "70vh" }}
    >
      <Text size="5" weight="bold">
        {error ? "Sign-in failed" : "Completing sign-in..."}
      </Text>
      <Text size="2" style={{ opacity: 0.7, marginTop: 10 }}>
        {error ?? "You can close this tab if it doesn't auto-redirect."}
      </Text>
    </Flex>
  );
}
