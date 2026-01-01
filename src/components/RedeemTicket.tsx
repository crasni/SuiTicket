import { useMemo, useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { DEFAULT_CHAIN } from "../config/network";
import { redeemTarget } from "../config/contracts";

export default function RedeemTicket() {
  const account = useCurrentAccount();
  const [ticketId, setTicketId] = useState("");
  const [digest, setDigest] = useState("");
  const [lastError, setLastError] = useState("");

  const canRun = useMemo(
    () => !!account && ticketId.startsWith("0x") && ticketId.length > 10,
    [account, ticketId],
  );

  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  function buildRedeemTx() {
    const tx = new Transaction();

    // TODO: 這裡等你們合約定版：
    // 假設 redeem(ticket: &mut Ticket, validator_cap: &ValidatorCap)
    // 你就要傳入 object 參考，例如：
    // tx.moveCall({
    //   target: redeemTarget(),
    //   arguments: [tx.object(ticketId), tx.object(validatorCapId)],
    // });

    tx.moveCall({
      target: redeemTarget(),
      arguments: [
        // 先留空讓你填（合約定版後我們補）
      ],
    });

    return tx;
  }

  return (
    <section>
      <h3>2) Redeem (Check-in)</h3>

      <div style={{ display: "flex", gap: 12 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          placeholder="Ticket object id (0x...)"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
        />
        <button
          disabled={!canRun || isPending}
          onClick={() => {
            setLastError("");
            setDigest("");

            const tx = buildRedeemTx();

            signAndExecute(
              { transaction: tx, chain: DEFAULT_CHAIN },
              {
                onSuccess: (res) => setDigest(res.digest),
                onError: (e) => setLastError(String(e)),
              },
            );
          }}
        >
          {isPending ? "Redeeming..." : "Redeem"}
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        {digest && (
          <div>
            Success. Digest: <code>{digest}</code>
          </div>
        )}
        {lastError && (
          <div style={{ color: "crimson" }}>Error: {lastError}</div>
        )}
      </div>

      <div style={{ marginTop: 12, opacity: 0.7 }}>
        目前 moveCall 的 arguments 還沒填；等你拿到合約 redeem 介面後，我們把
        ticket/validatorCap/eventId 塞進去。
      </div>
    </section>
  );
}
