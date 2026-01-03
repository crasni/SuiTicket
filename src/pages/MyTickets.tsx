import { useEffect, useMemo, useState } from "react";
import { Button, Flex, Text } from "@radix-ui/themes";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { QRCodeSVG } from "qrcode.react";

import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import Surface from "../components/Surface";
import CopyPill from "../components/CopyPill";
import { CURRENT_PACKAGE_ID, TARGETS } from "../config/contracts";
import { useEventNames } from "../hooks/useEventNames";
import { getSharedVersion, parseMoveObject, u8vecToString } from "../sui/parse";

type TicketRow = { id: string; eventId?: string; used?: boolean };
type PermitRow = { id: string; ticketId?: string; eventId?: string };

const MIST_PER_SUI = 1_000_000_000n;

function formatSuiFromMist(mist: bigint) {
  const whole = mist / MIST_PER_SUI;
  const frac = mist % MIST_PER_SUI;
  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}

function feeBreakdown(priceMist: bigint, feeBps: number) {
  const feeMist = (priceMist * BigInt(feeBps)) / 10_000n;
  const payoutMist = priceMist - feeMist;
  return { feeMist, payoutMist };
}

function shortAddr(a?: string) {
  if (!a) return "-";
  const s = a.trim();
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function shortId(id?: string) {
  if (!id) return "-";
  const s = id.trim();
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function QrCodeModal({
  open,
  onClose,
  title,
  value,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  value: string;
}) {
  if (!open) return null;

  return (
    <div className="st-modalBackdrop" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(520px, 100%)" }}
      >
        <Surface>
          <Flex direction="column" gap="3" align="center">
            <Flex
              align="center"
              justify="between"
              gap="3"
              style={{ width: "100%" }}
            >
              <Text weight="bold">{title}</Text>
              <Button size="2" variant="soft" color="gray" onClick={onClose}>
                Close
              </Button>
            </Flex>

            <Flex
              align="center"
              justify="center"
              style={{
                width: 280,
                height: 280,
                borderRadius: 12,
                background: "white",
              }}
            >
              <QRCodeSVG value={value} size={240} />
            </Flex>

            <Text
              size="2"
              style={{ wordBreak: "break-all", opacity: 0.7, width: "100%" }}
            >
              {value}
            </Text>

            <Flex gap="2" wrap="wrap" justify="center">
              <CopyPill value={value} label="Copy Ticket ID" size="2" />
            </Flex>
          </Flex>
        </Surface>
      </div>
    </div>
  );
}

export default function MyTickets() {
  const account = useCurrentAccount();
  const client = useSuiClient();

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [permits, setPermits] = useState<PermitRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [eventDetails, setEventDetails] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState("");
  const [qrTicketId, setQrTicketId] = useState<string | null>(null);

  const [redeemStatus, setRedeemStatus] = useState("");
  const [redeemBusyKey, setRedeemBusyKey] = useState<string>("");

  const [eventInfoById, setEventInfoById] = useState<Record<string, any>>({});
  const [eventLoadingById, setEventLoadingById] = useState<
    Record<string, boolean>
  >({});

  const pkgPrefix = useMemo(
    () => `${CURRENT_PACKAGE_ID}::ticket::`,
    [CURRENT_PACKAGE_ID],
  );
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const eventIdsForNames = useMemo(() => {
    const ids = [
      ...tickets.map((t) => t.eventId),
      ...permits.map((p) => p.eventId),
    ].filter(Boolean) as string[];
    return Array.from(new Set(ids));
  }, [tickets, permits]);

  const eventNameMap = useEventNames(eventIdsForNames);

  const ticketGroups = useMemo(() => {
    const map = new Map<string, TicketRow[]>();
    for (const t of tickets) {
      const key = t.eventId ?? "(unknown)";
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [tickets]);

  async function loadEventInfo(eventId: string) {
    if (!eventId || eventId === "(unknown)") return;
    if (eventInfoById[eventId]) return; // cached
    if (eventLoadingById[eventId]) return;

    setEventLoadingById((m) => ({ ...m, [eventId]: true }));
    try {
      const obj = await client.getObject({
        id: eventId,
        options: { showContent: true, showOwner: true, showType: true },
      });

      const p = parseMoveObject(obj);
      if (!p?.fields) throw new Error("Event not found");

      const f = p.fields;
      const name = u8vecToString(f.name);
      const organizer = String(f.organizer ?? "");
      const platform = String(f.platform ?? "");
      const priceMist = BigInt(f.price_mist ?? 0);
      const feeBps = Number(f.fee_bps ?? 0);
      const sharedVersion = getSharedVersion(p.owner);

      const { feeMist, payoutMist } = feeBreakdown(priceMist, feeBps);

      setEventInfoById((m) => ({
        ...m,
        [eventId]: {
          id: eventId,
          name,
          organizer,
          platform,
          priceMist,
          priceSui: formatSuiFromMist(priceMist),
          feeBps,
          feeSui: formatSuiFromMist(feeMist),
          payoutSui: formatSuiFromMist(payoutMist),
          sharedVersion,
        },
      }));
    } catch (e: any) {
      setEventInfoById((m) => ({
        ...m,
        [eventId]: { id: eventId, error: e?.message ?? String(e) },
      }));
    } finally {
      setEventLoadingById((m) => ({ ...m, [eventId]: false }));
    }
  }

  async function refreshOwned() {
    if (!account?.address) {
      setTickets([]);
      setPermits([]);
      return;
    }

    setStatus("Refreshing owned objects...");

    const all: any[] = [];
    let cursor: string | null | undefined = null;

    while (true) {
      const page = await client.getOwnedObjects({
        owner: account.address,
        cursor,
        limit: 50,
        options: { showType: true, showContent: true },
      });

      all.push(...(page.data ?? []));
      if (!page.hasNextPage) break;
      cursor = page.nextCursor;
    }

    const tks: TicketRow[] = [];
    const ps: PermitRow[] = [];

    for (const it of all) {
      const id = (it.data as any)?.objectId as string | undefined;
      const type = (it.data as any)?.type as string | undefined;
      if (!id || !type) continue;

      // ✅ strip generics: Ticket<...> / RedeemPermit<...>
      const baseType = type.split("<")[0];
      if (!baseType.startsWith(pkgPrefix)) continue;

      const fields = (it.data as any)?.content?.fields;

      if (baseType.endsWith("::Ticket")) {
        const used = fields?.used;
        const eventId = fields?.event_id ? String(fields.event_id) : undefined;
        tks.push({
          id,
          eventId,
          used: typeof used === "boolean" ? used : undefined,
        });
      } else if (baseType.endsWith("::RedeemPermit")) {
        const ticketId = fields?.ticket_id
          ? String(fields.ticket_id)
          : undefined;
        const eventId = fields?.event_id ? String(fields.event_id) : undefined;
        ps.push({ id, ticketId, eventId });
      }
    }

    setTickets(tks);
    setPermits(ps);
    setStatus(`✅ refreshed. tickets=${tks.length}, permits=${ps.length}`);
  }

  useEffect(() => {
    refreshOwned().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address]);

  async function waitTx(digest: string) {
    const txb = await (client as any).waitForTransactionBlock?.({
      digest,
      options: { showEffects: true, showObjectChanges: true },
    });
    if (txb) return txb;

    for (let i = 0; i < 25; i++) {
      try {
        const t = await client.getTransactionBlock({
          digest,
          options: { showEffects: true, showObjectChanges: true },
        });
        const s = (t as any)?.effects?.status?.status;
        if (s) return t;
      } catch {}
      await new Promise((r) => setTimeout(r, 250 + i * 50));
    }
    throw new Error("Timed out waiting for transaction result.");
  }

  function permitForTicket(ticketId: string): PermitRow[] {
    return permits.filter((p) => p.ticketId === ticketId);
  }

  function onRedeem(ticketId: string, permitId: string) {
    if (!account?.address) {
      setRedeemStatus("Please connect your wallet.");
      return;
    }
    const t = ticketId.trim();
    const p = permitId.trim();
    if (!t || !p) return;

    const busyKey = `${t}:${p}`;
    setRedeemBusyKey(busyKey);
    setRedeemStatus("Redeeming...");

    const tx = new Transaction();
    tx.setGasBudget(30_000_000);
    tx.moveCall({
      target: TARGETS.redeemWithPermit,
      arguments: [tx.object(t), tx.object(p)],
    });

    signAndExecute(
      { transaction: tx, chain: "sui:testnet" },
      {
        onSuccess: async (res) => {
          try {
            const txb = await waitTx(res.digest);
            const ok = (txb as any)?.effects?.status?.status === "success";
            const err = (txb as any)?.effects?.status?.error;
            if (!ok) {
              setRedeemStatus(`❌ redeem failed: ${err ?? "Unknown error"}`);
              return;
            }
            setRedeemStatus("✅ Redeemed! Refreshing...");
            await refreshOwned();
          } catch (e: any) {
            setRedeemStatus(
              `✅ Redeem sent. (Couldn't load final status): ${
                e?.message ?? String(e)
              }`,
            );
          } finally {
            setRedeemBusyKey("");
          }
        },
        onError: (err) => {
          setRedeemStatus(`❌ redeem failed: ${String(err)}`);
          setRedeemBusyKey("");
        },
      },
    );
  }

  return (
    <>
      <QrCodeModal
        open={!!qrTicketId}
        onClose={() => setQrTicketId(null)}
        title="Ticket QR"
        value={qrTicketId ?? ""}
      />

      <Flex direction="column" gap="4">
        <PageHeader
          title="My Tickets"
          subtitle="Keep it clean. Show QR only when staff needs to scan."
          right={
            <Button
              size="2"
              variant="soft"
              onClick={() => refreshOwned()}
              disabled={!account?.address || isPending}
            >
              Refresh
            </Button>
          }
        />

        {status ? (
          <Surface dense>
            <Text size="2" style={{ whiteSpace: "pre-wrap", opacity: 0.85 }}>
              {status}
            </Text>
          </Surface>
        ) : null}

        {redeemStatus ? (
          <Surface dense>
            <Text size="2" style={{ whiteSpace: "pre-wrap", opacity: 0.85 }}>
              {redeemStatus}
            </Text>
          </Surface>
        ) : null}

        <Flex direction="column" gap="2">
          <Text weight="medium">Tickets</Text>

          {tickets.length === 0 ? (
            <EmptyState
              title="No tickets"
              desc="Buy a ticket from an event to see it here."
            />
          ) : (
            <Flex direction="column" gap="4">
              {ticketGroups.map(([eventKey, arr]) => (
                <Flex key={eventKey} direction="column" gap="2">
                  <Flex align="center" justify="between" gap="2" wrap="wrap">
                    <Flex direction="column" gap="1">
                      <Text weight="medium">
                        {eventKey === "(unknown)"
                          ? "Unknown event"
                          : (eventNameMap[eventKey] ??
                            `Event ${shortId(eventKey)}`)}
                      </Text>
                      {eventKey !== "(unknown)" && eventDetails[eventKey] ? (
                        <Text
                          size="2"
                          style={{ opacity: 0.7, wordBreak: "break-all" }}
                        >
                          {eventKey}
                        </Text>
                      ) : null}
                    </Flex>

                    <Flex gap="2" wrap="wrap" align="center">
                      <Text size="2" style={{ opacity: 0.7 }}>
                        {arr.length} ticket{arr.length === 1 ? "" : "s"}
                      </Text>
                      {eventKey !== "(unknown)" ? (
                        <Button
                          size="2"
                          variant="soft"
                          color="gray"
                          onClick={() => {
                            setEventDetails((m) => {
                              const next = !m[eventKey];
                              // only fetch when opening
                              if (next) loadEventInfo(eventKey).catch(() => {});
                              return { ...m, [eventKey]: next };
                            });
                          }}
                        >
                          {eventDetails[eventKey] ? "Hide details" : "Details"}
                        </Button>
                      ) : null}
                    </Flex>
                  </Flex>

                  {eventKey !== "(unknown)" && eventDetails[eventKey] ? (
                    <Surface dense>
                      <Flex direction="column" gap="2">
                        <Text size="2" color="gray">
                          Event details
                        </Text>

                        {eventLoadingById[eventKey] ? (
                          <Text size="2" style={{ opacity: 0.75 }}>
                            Loading…
                          </Text>
                        ) : eventInfoById[eventKey]?.error ? (
                          <Text size="2" color="red">
                            Failed to load event:{" "}
                            {eventInfoById[eventKey].error}
                          </Text>
                        ) : eventInfoById[eventKey] ? (
                          <>
                            <Text size="3" weight="medium">
                              {eventInfoById[eventKey].name ||
                                `Event ${shortId(eventKey)}`}
                            </Text>

                            <Flex gap="3" wrap="wrap">
                              <Text size="2" style={{ opacity: 0.85 }}>
                                Price: <b>{eventInfoById[eventKey].priceSui}</b>{" "}
                                SUI
                              </Text>
                              <Text size="2" style={{ opacity: 0.85 }}>
                                Fee:{" "}
                                <b>
                                  {(
                                    eventInfoById[eventKey].feeBps / 100
                                  ).toFixed(2)}
                                  %
                                </b>{" "}
                                ({eventInfoById[eventKey].feeSui} SUI)
                              </Text>
                              <Text size="2" style={{ opacity: 0.85 }}>
                                Organizer receives:{" "}
                                {eventInfoById[eventKey].payoutSui} SUI
                              </Text>
                            </Flex>

                            <div className="st-divider" />

                            <Flex direction="column" gap="1">
                              <Flex
                                align="center"
                                justify="between"
                                gap="2"
                                wrap="wrap"
                              >
                                <Text size="2" style={{ opacity: 0.85 }}>
                                  Organizer:{" "}
                                  {shortAddr(eventInfoById[eventKey].organizer)}
                                </Text>
                                <CopyPill
                                  value={eventInfoById[eventKey].organizer}
                                  label="Copy"
                                  size="1"
                                />
                              </Flex>

                              <Flex
                                align="center"
                                justify="between"
                                gap="2"
                                wrap="wrap"
                              >
                                <Text size="2" style={{ opacity: 0.85 }}>
                                  Platform:{" "}
                                  {shortAddr(eventInfoById[eventKey].platform)}
                                </Text>
                                <CopyPill
                                  value={eventInfoById[eventKey].platform}
                                  label="Copy"
                                  size="1"
                                />
                              </Flex>
                            </Flex>

                            <div className="st-divider" />

                            <Flex
                              align="center"
                              justify="between"
                              gap="2"
                              wrap="wrap"
                            >
                              <Text
                                size="2"
                                style={{
                                  wordBreak: "break-all",
                                  opacity: 0.85,
                                  flex: 1,
                                  minWidth: 240,
                                }}
                              >
                                <Text weight="medium">Event ID:</Text>{" "}
                                {eventKey}
                              </Text>
                              <CopyPill
                                value={eventKey}
                                label="Copy"
                                size="1"
                              />
                            </Flex>

                            {eventInfoById[eventKey].sharedVersion ? (
                              <Flex
                                align="center"
                                justify="between"
                                gap="2"
                                wrap="wrap"
                              >
                                <Text
                                  size="2"
                                  style={{
                                    wordBreak: "break-all",
                                    opacity: 0.85,
                                    flex: 1,
                                    minWidth: 240,
                                  }}
                                >
                                  <Text weight="medium">Shared version:</Text>{" "}
                                  {eventInfoById[eventKey].sharedVersion}
                                </Text>
                                <CopyPill
                                  value={eventInfoById[eventKey].sharedVersion}
                                  label="Copy"
                                  size="1"
                                />
                              </Flex>
                            ) : null}
                          </>
                        ) : (
                          <Text size="2" style={{ opacity: 0.75 }}>
                            (No cached details yet.)
                          </Text>
                        )}
                      </Flex>
                    </Surface>
                  ) : null}

                  <Flex direction="column" gap="2">
                    {arr.map((t) => {
                      const perms = permitForTicket(t.id);
                      const hasPermit = perms.length > 0;
                      const isExpanded = !!expanded[t.id];
                      const quickPermit =
                        !t.used && perms.length === 1 ? perms[0] : null;

                      return (
                        <Surface key={t.id}>
                          <Flex direction="column" gap="2">
                            <Flex
                              align="center"
                              justify="between"
                              gap="3"
                              wrap="wrap"
                            >
                              <Flex
                                direction="column"
                                gap="1"
                                style={{ minWidth: 260 }}
                              >
                                <Text size="3" weight="medium">
                                  {t.used ? "✅ Checked in" : "🎟️ Valid ticket"}
                                </Text>
                                <Text size="2" style={{ opacity: 0.7 }}>
                                  Ticket: {shortId(t.id)}
                                </Text>
                              </Flex>

                              <Flex gap="2" wrap="wrap" align="center">
                                <Button
                                  size="2"
                                  variant="soft"
                                  onClick={() => setQrTicketId(t.id)}
                                >
                                  Show QR
                                </Button>

                                <Button
                                  size="2"
                                  variant="soft"
                                  color="gray"
                                  onClick={() =>
                                    setExpanded((m) => ({
                                      ...m,
                                      [t.id]: !m[t.id],
                                    }))
                                  }
                                >
                                  {isExpanded ? "Hide details" : "Details"}
                                </Button>

                                {quickPermit ? (
                                  <Button
                                    size="2"
                                    onClick={() =>
                                      onRedeem(t.id, quickPermit.id)
                                    }
                                    disabled={
                                      isPending ||
                                      redeemBusyKey ===
                                        `${t.id}:${quickPermit.id}`
                                    }
                                  >
                                    {redeemBusyKey ===
                                    `${t.id}:${quickPermit.id}`
                                      ? "Redeeming..."
                                      : "Redeem"}
                                  </Button>
                                ) : null}
                              </Flex>
                            </Flex>

                            {!t.used ? (
                              <Text size="2" style={{ opacity: 0.75 }}>
                                {hasPermit
                                  ? "Permit received ✅ You can redeem now."
                                  : "Waiting for staff permit… (show QR to staff)"}
                              </Text>
                            ) : null}

                            {isExpanded ? (
                              <Surface dense>
                                <Flex direction="column" gap="2">
                                  <Text size="2" color="gray">
                                    Details
                                  </Text>

                                  <Flex
                                    align="center"
                                    justify="between"
                                    gap="2"
                                    wrap="wrap"
                                  >
                                    <Text
                                      size="2"
                                      style={{
                                        wordBreak: "break-all",
                                        opacity: 0.85,
                                        flex: 1,
                                        minWidth: 240,
                                      }}
                                    >
                                      <Text weight="medium">Ticket ID:</Text>{" "}
                                      {t.id}
                                    </Text>
                                    <CopyPill
                                      value={t.id}
                                      label="Copy"
                                      size="1"
                                    />
                                  </Flex>

                                  <Text
                                    size="2"
                                    style={{
                                      wordBreak: "break-all",
                                      opacity: 0.85,
                                    }}
                                  >
                                    <Text weight="medium">Event:</Text>{" "}
                                    {t.eventId
                                      ? (eventNameMap[t.eventId] ??
                                        shortId(t.eventId))
                                      : "-"}
                                  </Text>

                                  {t.eventId ? (
                                    <Flex
                                      align="center"
                                      justify="between"
                                      gap="2"
                                      wrap="wrap"
                                    >
                                      <Text
                                        size="2"
                                        style={{
                                          wordBreak: "break-all",
                                          opacity: 0.85,
                                          flex: 1,
                                          minWidth: 240,
                                        }}
                                      >
                                        <Text weight="medium">Event ID:</Text>{" "}
                                        {t.eventId}
                                      </Text>
                                      <CopyPill
                                        value={t.eventId}
                                        label="Copy"
                                        size="1"
                                      />
                                    </Flex>
                                  ) : (
                                    <Text size="2" style={{ opacity: 0.85 }}>
                                      <Text weight="medium">Event ID:</Text> -
                                    </Text>
                                  )}

                                  <Text size="2" style={{ opacity: 0.85 }}>
                                    <Text weight="medium">Used:</Text>{" "}
                                    {String(t.used ?? false)}
                                  </Text>

                                  <Text
                                    size="2"
                                    color="gray"
                                    style={{ marginTop: 6 }}
                                  >
                                    Permits for this ticket
                                  </Text>

                                  {perms.length === 0 ? (
                                    <Text size="2" style={{ opacity: 0.75 }}>
                                      None yet.
                                    </Text>
                                  ) : (
                                    <Flex direction="column" gap="2">
                                      {perms.map((p) => (
                                        <Flex
                                          key={p.id}
                                          align="center"
                                          justify="between"
                                          gap="2"
                                          wrap="wrap"
                                        >
                                          <Text
                                            size="2"
                                            style={{
                                              wordBreak: "break-all",
                                              opacity: 0.85,
                                              flex: 1,
                                              minWidth: 260,
                                            }}
                                          >
                                            {p.id}
                                          </Text>

                                          <Flex gap="2" align="center">
                                            <CopyPill
                                              value={p.id}
                                              label="Copy"
                                              size="1"
                                            />
                                            {!t.used ? (
                                              <Button
                                                size="2"
                                                onClick={() =>
                                                  onRedeem(t.id, p.id)
                                                }
                                                disabled={
                                                  isPending ||
                                                  redeemBusyKey ===
                                                    `${t.id}:${p.id}`
                                                }
                                              >
                                                {redeemBusyKey ===
                                                `${t.id}:${p.id}`
                                                  ? "Redeeming..."
                                                  : "Redeem"}
                                              </Button>
                                            ) : null}
                                          </Flex>
                                        </Flex>
                                      ))}
                                    </Flex>
                                  )}
                                </Flex>
                              </Surface>
                            ) : null}
                          </Flex>
                        </Surface>
                      );
                    })}
                  </Flex>
                </Flex>
              ))}
            </Flex>
          )}
        </Flex>
      </Flex>
    </>
  );
}
