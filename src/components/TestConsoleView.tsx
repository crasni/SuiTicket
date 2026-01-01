import React, { useEffect, useMemo, useState } from "react";

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
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "PingFang TC", "Microsoft JhengHei", "Helvetica Neue", Arial, sans-serif',
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

function clampInt(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// allow: "", "0", "12", "12.", "12.3" ... up to 9 decimals
function sanitizeSuiInput(v: string) {
  const s = v.trim();
  if (s === "") return "";
  const m = s.match(/^(\d+)(\.(\d{0,9})?)?$/);
  if (!m) return null; // invalid
  const a = m[1];
  const frac = m[3] ?? "";
  return frac.length > 0 ? `${a}.${frac}` : m[2] ? `${a}.` : a;
}

function suiToMistSafe(s: string): bigint {
  const [a, b = ""] = s.trim().split(".");
  const frac = (b + "000000000").slice(0, 9);
  const A = a === "" ? "0" : a;
  return BigInt(A) * 1_000_000_000n + BigInt(frac);
}

function mistToSuiStr(m: bigint): string {
  const sign = m < 0n ? "-" : "";
  const x = m < 0n ? -m : m;
  const a = x / 1_000_000_000n;
  const b = x % 1_000_000_000n;
  const frac = b.toString().padStart(9, "0").replace(/0+$/, "");
  return sign + (frac ? `${a}.${frac}` : `${a}`);
}

function shortId(id: string) {
  if (!id) return "";
  return `${id.slice(0, 10)}…${id.slice(-8)}`;
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
  onCopy,
}: {
  label: string;
  id: string;
  setId: (v: string) => void;
  onCopy: (text: string, label?: string) => void;
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
              title={id}
            >
              View on Suiscan ({shortId(id)})
            </a>
            <button
              style={ui.btn()}
              onClick={() => onCopy(id, "ID copied")}
              type="button"
            >
              Copy ID
            </button>
            <button
              style={ui.btn()}
              onClick={async () => {
                try {
                  const t = await navigator.clipboard.readText();
                  setId(t.trim());
                  onCopy("", "Pasted ✓");
                } catch {}
              }}
              type="button"
            >
              Paste
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
  onCopy,
}: {
  title: string;
  items: OwnedItem[];
  onPick?: (id: string) => void;
  renderExtra?: (x: OwnedItem) => React.ReactNode;
  onCopy: (id: string, label?: string) => void;
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
                  title={x.id}
                >
                  {shortId(x.id)}
                </a>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    style={ui.btn()}
                    onClick={() => onCopy(x.id, "Copied")}
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

function TicketList({
  items,
  onPick,
  onCopy,
}: {
  items: OwnedItem[];
  onPick?: (id: string) => void;
  onCopy: (id: string, label?: string) => void;
}) {
  const groups = useMemo(() => {
    const mp = new Map<string, OwnedItem[]>();
    for (const t of items) {
      const k = t.extra || "(no event_id)";
      if (!mp.has(k)) mp.set(k, []);
      mp.get(k)!.push(t);
    }
    const arr = Array.from(mp.entries()).map(([eventId, ts]) => {
      ts.sort((a, b) => {
        const au = a.used ? 1 : 0;
        const bu = b.used ? 1 : 0;
        if (au !== bu) return au - bu; // unused first
        return a.id.localeCompare(b.id);
      });
      return { eventId, tickets: ts };
    });
    arr.sort((g1, g2) => {
      const u1 = g1.tickets.filter((t) => !t.used).length;
      const u2 = g2.tickets.filter((t) => !t.used).length;
      if (u1 !== u2) return u2 - u1;
      return g1.eventId.localeCompare(g2.eventId);
    });
    return arr;
  }, [items]);

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
        <div style={{ display: "grid", gap: 12 }}>
          {groups.map((g) => {
            const unused = g.tickets.filter((t) => !t.used).length;
            const used = g.tickets.length - unused;

            return (
              <div
                key={g.eventId}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.18)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    background: "rgba(255,255,255,0.05)",
                    borderBottom: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <div style={{ display: "grid", gap: 4 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 750,
                        color: "rgba(255,255,255,0.88)",
                      }}
                    >
                      Event:{" "}
                      {g.eventId === "(no event_id)" ? (
                        <span style={ui.mono}>(no event_id)</span>
                      ) : (
                        <a
                          href={suiscanObjectUrl(g.eventId)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ ...ui.mono, textDecoration: "none" }}
                          title={g.eventId}
                        >
                          {shortId(g.eventId)}
                        </a>
                      )}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.75 }}>
                      {unused} unused · {used} used
                    </div>
                  </div>

                  <Pill tone={unused > 0 ? "ok" : "info"}>
                    {unused > 0 ? "Active" : "All used"}
                  </Pill>
                </div>

                <div style={{ display: "grid" }}>
                  {g.tickets.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 0.6fr 1.2fr",
                        gap: 10,
                        alignItems: "center",
                        padding: "10px 12px",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <a
                        href={suiscanObjectUrl(t.id)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...ui.mono, textDecoration: "none" }}
                        title={t.id}
                      >
                        {shortId(t.id)}
                      </a>

                      <div>
                        <Pill tone={t.used ? "warn" : "ok"}>
                          {t.used ? "used" : "unused"}
                        </Pill>
                      </div>

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
                          onClick={() => onCopy(t.id, "Ticket copied")}
                          type="button"
                        >
                          Copy
                        </button>
                        {onPick ? (
                          <button
                            style={ui.btn(true)}
                            onClick={() => onPick(t.id)}
                            type="button"
                          >
                            Use
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  reason,
  primary,
}: {
  label: string;
  onClick: () => void;
  reason?: string;
  primary?: boolean;
}) {
  const disabled = Boolean(reason);
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          ...ui.btn(primary),
          ...(disabled ? ui.btnDisabled : {}),
        }}
        type="button"
        title={reason || ""}
      >
        {label}
      </button>
      <div style={{ fontSize: 11, opacity: 0.75, minHeight: 14 }}>
        {reason || ""}
      </div>
    </div>
  );
}

export type TestConsoleViewProps = {
  address?: string;

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

  priceSui: string;
  setPriceSui: (v: string) => void;

  feeBps: string;
  setFeeBps: (v: string) => void;

  platformAddr: string;
  setPlatformAddr: (v: string) => void;

  isPending: boolean;
  status: string;
  lastDigest: string;
  ticketUsed: boolean | null;

  ownedEvents: OwnedItem[];
  ownedCaps: OwnedItem[];
  ownedTickets: OwnedItem[];

  onFaucet: () => void;
  onCreateEvent: () => void;
  onBuyTicket: () => void;
  onRedeem: () => void;
  onLookupTicket: () => void;
  refreshOwned: () => void;
};

export default function TestConsoleView(p: TestConsoleViewProps) {
  const connected = Boolean(p.address);

  // toast
  const [toast, setToast] = useState<string>("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1200);
    return () => clearTimeout(t);
  }, [toast]);

  async function copy(text: string, label = "Copied") {
    if (label === "Pasted ✓") {
      setToast(label);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setToast(`${label} ✓`);
    } catch {
      setToast("Copy failed");
    }
  }

  // responsive
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const f = () => setIsNarrow(window.innerWidth < 900);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  // payment preview (9)
  const priceMist = p.priceSui ? suiToMistSafe(p.priceSui) : 0n;
  const fee = clampInt(Number(p.feeBps || "0"), 0, 10000);
  const feeMist = (priceMist * BigInt(fee)) / 10000n;
  const orgMist = priceMist - feeMist;

  // disabled reasons (2)
  const pendingReason = p.isPending ? "Tx pending…" : "";
  const needWallet = !connected ? "Connect wallet" : "";

  const rFaucet = needWallet || pendingReason;
  const rCreate = needWallet || pendingReason;
  const rBuy =
    needWallet || pendingReason || (!p.eventId ? "Need Event ID" : "");
  const rRedeem =
    needWallet ||
    pendingReason ||
    (!p.ticketId ? "Need Ticket ID" : "") ||
    (!p.capId ? "Need GateCap ID" : "");
  const rLookup = pendingReason || (!p.ticketId ? "Need Ticket ID" : "");
  const rRefresh = needWallet || pendingReason;

  return (
    <div style={ui.page}>
      {toast ? (
        <div
          style={{
            position: "sticky",
            top: 10,
            zIndex: 50,
            marginBottom: 10,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.45)",
              fontSize: 12,
              color: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(8px)",
            }}
          >
            {toast}
          </div>
        </div>
      ) : null}

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
        <div
          style={{
            ...ui.topGrid,
            gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
          }}
        >
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

              <div style={{ marginTop: 10 }}>
                <Field
                  label="Price (SUI)"
                  value={p.priceSui}
                  onChange={(v) => {
                    const s = sanitizeSuiInput(v);
                    if (s !== null) p.setPriceSui(s);
                  }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <Field
                  label="Platform fee (bps)"
                  value={p.feeBps}
                  onChange={(v) => {
                    const digits = v.replace(/[^\d]/g, "");
                    if (digits === "") return p.setFeeBps("");
                    const n = clampInt(Number(digits), 0, 10000);
                    p.setFeeBps(String(n));
                  }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <Field
                  label="Platform address"
                  value={p.platformAddr}
                  onChange={(v) => p.setPlatformAddr(v.trim())}
                />
              </div>

              {/* payment preview */}
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.22)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 750,
                    marginBottom: 8,
                    color: "rgba(255,255,255,0.88)",
                  }}
                >
                  Payment preview
                </div>

                <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <span>You pay</span>
                    <span style={ui.mono}>{mistToSuiStr(priceMist)} SUI</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <span>Platform fee ({fee} bps)</span>
                    <span style={ui.mono}>{mistToSuiStr(feeMist)} SUI</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <span>Organizer gets</span>
                    <span style={ui.mono}>{mistToSuiStr(orgMist)} SUI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* IDs */}
            <div style={ui.card}>
              <div style={ui.cardTitle}>IDs</div>
              <div style={{ display: "grid", gap: 12 }}>
                <IdRow
                  label="Event ID"
                  id={p.eventId}
                  setId={p.setEventId}
                  onCopy={copy}
                />
                <IdRow
                  label="GateCap ID"
                  id={p.capId}
                  setId={p.setCapId}
                  onCopy={copy}
                />
                <IdRow
                  label="Ticket ID"
                  id={p.ticketId}
                  setId={p.setTicketId}
                  onCopy={copy}
                />
              </div>
            </div>
          </div>

          <div style={ui.stack}>
            {/* Actions */}
            <div style={ui.card}>
              <div style={ui.cardTitle}>Actions</div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                }}
              >
                <ActionBtn
                  label="⛽ Faucet"
                  onClick={p.onFaucet}
                  reason={rFaucet}
                />
                <ActionBtn
                  label="🏟️ Create Event + Cap"
                  onClick={p.onCreateEvent}
                  reason={rCreate}
                  primary
                />
                <ActionBtn
                  label="🎟️ Buy Ticket"
                  onClick={p.onBuyTicket}
                  reason={rBuy}
                  primary
                />
                <ActionBtn
                  label="✅ Redeem"
                  onClick={p.onRedeem}
                  reason={rRedeem}
                />
                <ActionBtn
                  label="🔎 Lookup"
                  onClick={p.onLookupTicket}
                  reason={rLookup}
                />
                <ActionBtn
                  label="🔄 Refresh Owned"
                  onClick={p.refreshOwned}
                  reason={rRefresh}
                />
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

        {/* Owned */}
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
              onCopy={copy}
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
              onCopy={copy}
            />

            <TicketList
              items={p.ownedTickets}
              onPick={(id) => p.setTicketId(id)}
              onCopy={copy}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
