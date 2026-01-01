import { useMemo, useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { DEFAULT_CHAIN } from "../config/network";

export default function RedeemTicket() {
  const account = useCurrentAccount();
  const [objectId, setObjectId] = useState("");
  const [digest, setDigest] = useState("");
  const [lastError, setLastError] = useState("");

  const reason = useMemo(() => {
    if (!account) return "not connected";
    if (!objectId.startsWith("0x")) return "objectId must start with 0x";
    if (objectId.length <= 10) return "objectId too short";
    return "";
  }, [account, objectId]);

  const canRun = reason === "";

  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  function buildSelfTransferTx() {
    if (!account) throw new Error("No account connected");
    const tx = new Transaction();
    tx.transferObjects([tx.object(objectId)], tx.pure.address(account.address));
    return tx;
  }

  return (
    <section>
      <h3>2) CP1 — Transaction Pipeline Test (Self-transfer)</h3>

      <div style={{ marginBottom: 8, opacity: 0.8 }}>
        Account:{" "}
        {account ? <code>{account.address}</code> : <b>NOT CONNECTED</b>}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          placeholder="Paste an object id with hasPublicTransfer: true"
          value={objectId}
          onChange={(e) => setObjectId(e.target.value.trim())}
        />
        <button
          disabled={!canRun || isPending}
          onClick={() => {
            setDigest("");
            setLastError("");

            const tx = buildSelfTransferTx();
            signAndExecute(
              { transaction: tx, chain: DEFAULT_CHAIN },
              {
                onSuccess: (res) => setDigest(res.digest),
                onError: (e) => setLastError(String(e)),
              },
            );
          }}
        >
          {isPending ? "Sending..." : "Send tx"}
        </button>
      </div>

      {!canRun && (
        <div style={{ marginTop: 8, color: "crimson" }}>
          Disabled reason: <code>{reason}</code>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        {digest && (
          <div>
            ✅ Success. Digest: <code>{digest}</code>
          </div>
        )}
        {lastError && (
          <div style={{ color: "crimson" }}>❌ Error: {lastError}</div>
        )}
      </div>
    </section>
  );
}
