import React from "react";

export type OwnedItem = {
  id: string;
  type: string;
  extra?: string;
  used?: boolean;
};

function suiscanObjectUrl(id: string) {
  return `https://suiscan.xyz/testnet/object/${id}`;
}
function suiscanTxUrl(digest: string) {
  return `https://suiscan.xyz/testnet/tx/${digest}`;
}

const ui = {
  page: {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    background:
      "radial-gradient(1200px 600px at 20% 0%, rgba(120,120,255,0.18), transparent 60%), #0b0d12",
    boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
    color: "rgba(255,255,255,0.92)",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans", "Helvetica Neue", Arial',
  } as React.CSSProperties,

  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  } as React.CSSProperties,

  h2: {
    margin: 0,
    fontSize: 18,
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.96)",
  } as React.CSSProperties,
  sub: {
    fontSize: 12,
    opacity: 0.75,
    color: "rgba(255,255,255,0.70)",
  } as React.CSSProperties,

  grid2: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 14,
  } as React.CSSProperties,

  card: {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    padding: 14,
    color: "rgba(255,255,255,0.90)",
    backdropFilter: "blur(8px)",
  } as React.CSSProperties,

  cardTitle: {
    fontWeight: 750,
    fontSize: 13,
    marginBottom: 10,
    color: "rgba(255,255,255,0.92)",
  } as React.CSSProperties,

  row: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  } as React.CSSProperties,

  btn: (primary?: boolean): React.CSSProperties => ({
    border: "1px solid rgba(255,255,255,0.14)",
    background: primary ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    padding: "9px 10px",
    borderRadius: 10,
    fontSize: 13,
    cursor: "pointer",
    boxShadow: primary ? "0 8px 18px rgba(0,0,0,0.35)" : "none",
  }),

  btnDisabled: { opacity: 0.45, cursor: "not-allowed" } as React.CSSProperties,

  input: {
    width: "100%",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    padding: "9px 10px",
    fontSize: 13,
    outline: "none",
    background: "rgba(0,0,0,0.35)",
    color: "rgba(255,255,255,0.92)",
  } as React.CSSProperties,

  label: {
    fontWeight: 650,
    fontSize: 12,
    marginBottom: 6,
    color: "rgba(255,255,255,0.78)",
  } as React.CSSProperties,

  mono: {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 12,
    color: "rgba(255,255,255,0.88)",
  } as React.CSSProperties,

  pill: (tone: "ok" | "warn" | "info"): React.CSSProperties => {
    const map = {
      ok: {
        bg: "rgba(0,200,120,0.18)",
        fg: "rgba(160,255,210,0.95)",
        bd: "rgba(0,200,120,0.25)",
      },
      warn: {
        bg: "rgba(255,80,80,0.16)",
        fg: "rgba(255,190,190,0.95)",
        bd: "rgba(255,80,80,0.22)",
      },
      info: {
        bg: "rgba(255,255,255,0.08)",
        fg: "rgba(255,255,255,0.86)",
        bd: "rgba(255,255,255,0.12)",
      },
    }[tone];
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 8px",
      borderRadius: 999,
      border: `1px solid ${map.bd}`,
      background: map.bg,
      color: map.fg,
      fontSize: 12,
      fontWeight: 650,
    };
  },

  hr: {
    border: 0,
    borderTop: "1px solid rgba(255,255,255,0.10)",
    margin: "12px 0",
  } as React.CSSProperties,

  link: {
    fontSize: 12,
    opacity: 0.85,
    color: "rgba(180,200,255,0.95)",
  } as React.CSSProperties,

  topGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  } as React.CSSProperties,

  stack: {
    display: "grid",
    gap: 14,
  } as React.CSSProperties,
};

function Pill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "info";
  children: React.ReactNode;
}) {
  return <span style={ui.pill(tone)}>{children}</span>;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <div style={ui.label}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={ui.input}
      />
    </label>
  );
}

function IdRow({
  label,
  id,
  setId,
}: {
  label: string;
  id: string;
  setId: (v: string) => void;
}) {
  return (
    <div>
      <Field label={label} value={id} onChange={(v) => setId(v.trim())} />
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 6,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {id ? (
          <>
            <a
              href={suiscanObjectUrl(id)}
              target="_blank"
              rel="noreferrer"
              style={ui.link}
            >
              View on Suiscan
            </a>
            <button
              style={ui.btn()}
              onClick={() => navigator.clipboard.writeText(id)}
              type="button"
            >
              Copy ID
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function OwnedList({
  title,
  items,
  onPick,
  renderExtra,
}: {
  title: string;
  items: OwnedItem[];
  onPick?: (id: string) => void;
  renderExtra?: (x: OwnedItem) => React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={ui.cardTitle}>{title}</div>
        <Pill tone="info">{items.length}</Pill>
      </div>

      {items.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.7 }}>(none)</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((x) => (
            <div
              key={x.id}
              style={{
                padding: 10,
                borderRadius: 12,
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <a
                  href={suiscanObjectUrl(x.id)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...ui.mono, textDecoration: "none" }}
                >
                  {x.id}
                </a>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    style={ui.btn()}
                    onClick={() => navigator.clipboard.writeText(x.id)}
                    type="button"
                  >
                    Copy
                  </button>
                  {onPick ? (
                    <button
                      style={ui.btn(true)}
                      onClick={() => onPick(x.id)}
                      type="button"
                    >
                      Use
                    </button>
                  ) : null}
                </div>
              </div>

              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                <span style={ui.mono}>{x.type}</span>
                {renderExtra ? <span> · {renderExtra(x)}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function shortId(id: string) {
  if (!id) return "";
  return `${id.slice(0, 10)}…${id.slice(-8)}`;
}

function TicketList({
  items,
  onPick,
}: {
  items: OwnedItem[];
  onPick?: (id: string) => void;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={ui.cardTitle}>Owned Tickets</div>
        <Pill tone="info">{items.length}</Pill>
      </div>

      {items.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.7 }}>(none)</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {/* header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2.2fr 0.8fr 2.2fr 1.4fr",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              fontSize: 12,
              fontWeight: 700,
              color: "rgba(255,255,255,0.80)",
            }}
          >
            <div>Ticket</div>
            <div>Used</div>
            <div>Event</div>
            <div style={{ textAlign: "right" }}>Actions</div>
          </div>

          {/* rows */}
          {items.map((x) => (
            <div
              key={x.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2.2fr 0.8fr 2.2fr 1.4fr",
                gap: 10,
                alignItems: "center",
                padding: "10px 10px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.25)",
              }}
            >
              <a
                href={suiscanObjectUrl(x.id)}
                target="_blank"
                rel="noreferrer"
                style={{ ...ui.mono, textDecoration: "none" }}
                title={x.id}
              >
                {shortId(x.id)}
              </a>

              <div>
                <Pill tone={x.used ? "warn" : "ok"}>
                  {x.used ? "true" : "false"}
                </Pill>
              </div>

              <a
                href={x.extra ? suiscanObjectUrl(x.extra) : undefined}
                target="_blank"
                rel="noreferrer"
                style={{
                  ...ui.mono,
                  textDecoration: "none",
                  opacity: x.extra ? 1 : 0.6,
                  pointerEvents: x.extra ? "auto" : "none",
                }}
                title={x.extra || ""}
              >
                {x.extra ? shortId(x.extra) : "(no event_id)"}
              </a>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <button
                  style={ui.btn()}
                  onClick={() => navigator.clipboard.writeText(x.id)}
                  type="button"
                >
                  Copy
                </button>
                {onPick ? (
                  <button
                    style={ui.btn(true)}
                    onClick={() => onPick(x.id)}
                    type="button"
                  >
                    Use
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type TestConsoleViewProps = {
  // wallet
  address?: string;

  // config
  packageId: string;
  setPackageId: (v: string) => void;

  eventName: string;
  setEventName: (v: string) => void;

  eventId: string;
  setEventId: (v: string) => void;

  capId: string;
  setCapId: (v: string) => void;

  ticketId: string;
  setTicketId: (v: string) => void;

  // derived state
  isPending: boolean;
  status: string;
  lastDigest: string;
  ticketUsed: boolean | null;

  // owned
  ownedEvents: OwnedItem[];
  ownedCaps: OwnedItem[];
  ownedTickets: OwnedItem[];

  // actions
  onFaucet: () => void;
  onCreateEvent: () => void;
  onMintTicket: () => void;
  onRedeem: () => void;
  onLookupTicket: () => void;
  refreshOwned: () => void;
};

export default function TestConsoleView(p: TestConsoleViewProps) {
  const connected = Boolean(p.address);

  return (
    <div style={ui.page}>
      <div style={ui.headerRow}>
        <div>
          <h2 style={ui.h2}>SuiStage — Test Console</h2>
          <div style={ui.sub}>
            Network: Testnet · Package-scoped object dashboard
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Pill tone={connected ? "ok" : "warn"}>
            {connected ? "Wallet connected" : "Not connected"}
          </Pill>
          {p.address ? (
            <span style={ui.mono}>
              {p.address.slice(0, 10)}…{p.address.slice(-8)}
            </span>
          ) : null}
        </div>
      </div>

      <div style={ui.stack}>
        {/* ===== Top: Console ===== */}
        <div style={ui.topGrid}>
          <div style={ui.stack}>
            {/* Config */}
            <div style={ui.card}>
              <div style={ui.cardTitle}>Config</div>
              <Field
                label="Package ID"
                value={p.packageId}
                onChange={(v) => p.setPackageId(v.trim())}
              />
              <div style={{ marginTop: 10 }}>
                <Field
                  label="Event Name"
                  value={p.eventName}
                  onChange={p.setEventName}
                />
              </div>
            </div>

            {/* IDs */}
            <div style={ui.card}>
              <div style={ui.cardTitle}>IDs</div>
              <div style={{ display: "grid", gap: 12 }}>
                <IdRow label="Event ID" id={p.eventId} setId={p.setEventId} />
                <IdRow label="GateCap ID" id={p.capId} setId={p.setCapId} />
                <IdRow
                  label="Ticket ID"
                  id={p.ticketId}
                  setId={p.setTicketId}
                />
              </div>
            </div>
          </div>

          <div style={ui.stack}>
            {/* Actions */}
            <div style={ui.card}>
              <div style={ui.cardTitle}>Actions</div>

              <div style={ui.row}>
                <button
                  onClick={p.onFaucet}
                  disabled={!connected || p.isPending}
                  style={{
                    ...ui.btn(),
                    ...(!connected || p.isPending ? ui.btnDisabled : {}),
                  }}
                >
                  ⛽ Faucet
                </button>
                <button
                  onClick={p.onCreateEvent}
                  disabled={!connected || p.isPending}
                  style={{
                    ...ui.btn(true),
                    ...(!connected || p.isPending ? ui.btnDisabled : {}),
                  }}
                >
                  🏟️ Create Event + Cap
                </button>
                <button
                  onClick={p.onMintTicket}
                  disabled={!connected || p.isPending}
                  style={{
                    ...ui.btn(true),
                    ...(!connected || p.isPending ? ui.btnDisabled : {}),
                  }}
                >
                  🎟️ Mint Ticket
                </button>
                <button
                  onClick={p.onRedeem}
                  disabled={!connected || p.isPending}
                  style={{
                    ...ui.btn(),
                    ...(!connected || p.isPending ? ui.btnDisabled : {}),
                  }}
                >
                  ✅ Redeem
                </button>
                <button
                  onClick={p.onLookupTicket}
                  disabled={p.isPending}
                  style={{
                    ...ui.btn(),
                    ...(p.isPending ? ui.btnDisabled : {}),
                  }}
                >
                  🔎 Lookup
                </button>
                <button
                  onClick={p.refreshOwned}
                  disabled={!connected || p.isPending}
                  style={{
                    ...ui.btn(),
                    ...(!connected || p.isPending ? ui.btnDisabled : {}),
                  }}
                >
                  🔄 Refresh Owned
                </button>
              </div>

              <div style={ui.hr} />

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontWeight: 650, fontSize: 12 }}>
                  Ticket used?
                </div>
                <Pill
                  tone={
                    p.ticketUsed === true
                      ? "warn"
                      : p.ticketUsed === false
                        ? "ok"
                        : "info"
                  }
                >
                  {p.ticketUsed === null
                    ? "unknown"
                    : p.ticketUsed
                      ? "used"
                      : "unused"}
                </Pill>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 650, fontSize: 12, marginBottom: 6 }}>
                  Last Tx
                </div>
                <div style={ui.mono}>{p.lastDigest || "(none)"}</div>
                {p.lastDigest ? (
                  <div style={{ marginTop: 6 }}>
                    <a
                      href={suiscanTxUrl(p.lastDigest)}
                      target="_blank"
                      rel="noreferrer"
                      style={ui.link}
                    >
                      View tx on Suiscan
                    </a>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Status */}
            <div style={ui.card}>
              <div style={ui.cardTitle}>Status</div>
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: "rgba(255,255,255,0.88)",
                }}
              >
                {p.status || "(empty)"}
              </div>
            </div>
          </div>
        </div>

        {/* ===== Bottom: Owned ===== */}
        <div style={ui.card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div style={ui.cardTitle}>Owned</div>
            <Pill tone="info">
              E {p.ownedEvents.length} · C {p.ownedCaps.length} · T{" "}
              {p.ownedTickets.length}
            </Pill>
          </div>

          <div style={ui.stack}>
            <OwnedList
              title="Owned Events"
              items={p.ownedEvents}
              onPick={(id) => p.setEventId(id)}
              renderExtra={(x) =>
                x.extra ? (
                  <>
                    name: <span style={ui.mono}>{x.extra}</span>
                  </>
                ) : null
              }
            />

            <OwnedList
              title="Owned GateCaps"
              items={p.ownedCaps}
              onPick={(id) => p.setCapId(id)}
              renderExtra={(x) =>
                x.extra ? (
                  <>
                    event_id: <span style={ui.mono}>{x.extra}</span>
                  </>
                ) : null
              }
            />

            <TicketList
              items={p.ownedTickets}
              onPick={(id) => p.setTicketId(id)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
