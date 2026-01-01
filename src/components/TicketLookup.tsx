import { useState } from "react";
import { useSuiClientQuery } from "@mysten/dapp-kit";

export default function TicketLookup() {
  const [ticketId, setTicketId] = useState("");

  const enabled = ticketId.startsWith("0x") && ticketId.length > 10;

  const { data, isPending, error, refetch } = useSuiClientQuery(
    "getObject",
    {
      id: ticketId,
      options: { showContent: true, showType: true, showOwner: true },
    },
    { enabled },
  );

  return (
    <section>
      <h3>1) Lookup Ticket Object</h3>

      <div style={{ display: "flex", gap: 12 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          placeholder="Ticket object id (0x...)"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
        />
        <button onClick={() => refetch()} disabled={!enabled}>
          Fetch
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        {isPending && <div>Loading...</div>}
        {error && (
          <div style={{ color: "crimson" }}>Error: {String(error)}</div>
        )}
        {data && (
          <pre
            style={{
              background: "#111",
              color: "#ddd",
              padding: 12,
              borderRadius: 8,
              overflow: "auto",
            }}
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </section>
  );
}
