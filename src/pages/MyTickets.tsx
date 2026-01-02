import { useEffect, useMemo, useState } from "react";
import { Button, Card, Flex, Text } from "@radix-ui/themes";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { QRCodeSVG } from "qrcode.react";

import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { copyText } from "../lib/clipboard";
import { CURRENT_PACKAGE_ID, TARGETS } from "../config/contracts";
import { useEventNames } from "../hooks/useEventNames";

type TicketRow = { id: string; eventId?: string; used?: boolean };
type PermitRow = { id: string; ticketId?: string; eventId?: string };

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
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(520px, 100%)" }}
      >
        <Card>
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
              <Button
                size="2"
                variant="soft"
                onClick={() => copyText(value)}
                style={{ minWidth: 120 }}
              >
                Copy Ticket ID
              </Button>
            </Flex>
          </Flex>
        </Card>
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

  // Selection for redeem flow:
  // We auto-pair permit with ticket if exactly one exists.
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [selectedPermitId, setSelectedPermitId] = useState("");

  const pkgPrefix = useMemo(() => `${CURRENT_PACKAGE_ID}::ticket::`, []);
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const eventIdsForNames = useMemo(
    () => [...tickets.map((t) => t.eventId), ...permits.map((p) => p.eventId)],
    [tickets, permits],
  );
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
      if (!type.startsWith(pkgPrefix)) continue;

      const fields = (it.data as any)?.content?.fields;

      if (type.endsWith("::Ticket")) {
        const used = fields?.used;
        const eventId = fields?.event_id ? String(fields.event_id) : undefined;
        tks.push({
          id,
          eventId,
          used: typeof used === "boolean" ? used : undefined,
        });
      } else if (type.endsWith("::RedeemPermit")) {
        const ticketId = fields?.ticket_id
          ? String(fields.ticket_id)
          : undefined;
        const eventId = fields?.event_id ? String(fields.event_id) : undefined;
        ps.push({ id, ticketId, eventId });
      }
    }

    setTickets(tks);
    setPermits(ps);

    // Auto-pair permit if ticket already selected
    if (selectedTicketId) {
      const matches = ps.filter((p) => p.ticketId === selectedTicketId);
      if (matches.length === 1) setSelectedPermitId(matches[0].id);
    }

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

  function selectTicket(ticketId: string) {
    setSelectedTicketId(ticketId);
    const matches = permitForTicket(ticketId);
    if (matches.length === 1) setSelectedPermitId(matches[0].id);
    else setSelectedPermitId("");
  }

  function onRedeemWithPermit() {
    if (!account?.address) return setStatus("Please connect your wallet.");
    if (!selectedTicketId.trim()) return setStatus("Select a ticket first.");
    if (!selectedPermitId.trim())
      return setStatus("No permit paired yet (ask staff to issue).");

    setStatus("Redeeming with permit...");

    const tx = new Transaction();
    tx.setGasBudget(30_000_000);
    tx.moveCall({
      target: TARGETS.redeemWithPermit,
      arguments: [
        tx.object(selectedTicketId.trim()),
        tx.object(selectedPermitId.trim()),
      ],
    });

    signAndExecute(
      { transaction: tx, chain: "sui:testnet" },
      {
        onSuccess: async (res) => {
          try {
            const txb = await waitTx(res.digest);
            const ok = (txb as any)?.effects?.status?.status === "success";
            const err = (txb as any)?.effects?.status?.error;
            if (!ok)
              return setStatus(`❌ redeem failed: ${err ?? "Unknown error"}`);

            setStatus("✅ Redeemed! Refreshing...");
            await refreshOwned();
          } catch (e: any) {
            setStatus(
              `✅ Redeem sent. (Couldn't load final status): ${
                e?.message ?? String(e)
              }`,
            );
          }
        },
        onError: (err) => setStatus(`❌ redeem failed: ${String(err)}`),
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
          <Text size="2" style={{ whiteSpace: "pre-wrap", opacity: 0.85 }}>
            {status}
          </Text>
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
                          onClick={() =>
                            setEventDetails((m) => ({
                              ...m,
                              [eventKey]: !m[eventKey],
                            }))
                          }
                        >
                          {eventDetails[eventKey] ? "Hide details" : "Details"}
                        </Button>
                      ) : null}
                    </Flex>
                  </Flex>

                  {eventKey !== "(unknown)" && eventDetails[eventKey] ? (
                    <Card>
                      <Flex direction="column" gap="2">
                        <Text size="2" color="gray">
                          Event details
                        </Text>
                        <Text
                          size="2"
                          style={{ wordBreak: "break-all", opacity: 0.85 }}
                        >
                          <Text weight="medium">Event ID:</Text> {eventKey}
                          <Button
                            size="1"
                            variant="soft"
                            color="gray"
                            style={{ marginLeft: 8 }}
                            onClick={() =>
                              copyText(eventKey, "Event ID copied")
                            }
                          >
                            Copy
                          </Button>
                        </Text>
                      </Flex>
                    </Card>
                  ) : null}

                  <Flex direction="column" gap="2">
                    {arr.map((t) => {
                      const perms = permitForTicket(t.id);
                      const hasPermit = perms.length > 0;
                      const isSelected = selectedTicketId === t.id;
                      const isExpanded = !!expanded[t.id];

                      return (
                        <Card key={t.id}>
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
                                <Button
                                  size="2"
                                  variant={isSelected ? "solid" : "soft"}
                                  onClick={() => selectTicket(t.id)}
                                >
                                  {isSelected ? "Selected" : "Use for redeem"}
                                </Button>
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
                              <Card>
                                <Flex direction="column" gap="2">
                                  <Text size="2" color="gray">
                                    Details
                                  </Text>

                                  <Text
                                    size="2"
                                    style={{
                                      wordBreak: "break-all",
                                      opacity: 0.85,
                                    }}
                                  >
                                    <Text weight="medium">Ticket ID:</Text>{" "}
                                    {t.id}{" "}
                                    <Button
                                      size="1"
                                      variant="soft"
                                      color="gray"
                                      style={{ marginLeft: 8 }}
                                      onClick={() =>
                                        copyText(t.id, "Ticket ID copied")
                                      }
                                    >
                                      Copy
                                    </Button>
                                  </Text>

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

                                  <Text
                                    size="2"
                                    style={{
                                      wordBreak: "break-all",
                                      opacity: 0.85,
                                    }}
                                  >
                                    <Text weight="medium">Event ID:</Text>{" "}
                                    {t.eventId ?? "-"}{" "}
                                    {t.eventId ? (
                                      <Button
                                        size="1"
                                        variant="soft"
                                        color="gray"
                                        style={{ marginLeft: 8 }}
                                        onClick={() =>
                                          copyText(
                                            t.eventId!,
                                            "Event ID copied",
                                          )
                                        }
                                      >
                                        Copy
                                      </Button>
                                    ) : null}
                                  </Text>

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

                                          <Flex gap="2">
                                            <Button
                                              size="2"
                                              variant="soft"
                                              color="gray"
                                              onClick={() => copyText(p.id)}
                                            >
                                              Copy
                                            </Button>
                                            <Button
                                              size="2"
                                              variant={
                                                selectedPermitId === p.id
                                                  ? "solid"
                                                  : "soft"
                                              }
                                              onClick={() =>
                                                setSelectedPermitId(p.id)
                                              }
                                            >
                                              {selectedPermitId === p.id
                                                ? "Using"
                                                : "Use"}
                                            </Button>
                                          </Flex>
                                        </Flex>
                                      ))}
                                    </Flex>
                                  )}
                                </Flex>
                              </Card>
                            ) : null}
                          </Flex>
                        </Card>
                      );
                    })}
                  </Flex>
                </Flex>
              ))}
            </Flex>
          )}
        </Flex>

        {/* Redeem section */}
        <Card>
          <Flex direction="column" gap="3">
            <Text weight="medium">Redeem</Text>

            {!selectedTicketId ? (
              <Text size="2" style={{ opacity: 0.75 }}>
                Select a ticket above. If staff already issued a permit, Redeem
                will be available.
              </Text>
            ) : (
              <>
                <Text size="2" style={{ opacity: 0.75 }}>
                  Ticket: {shortId(selectedTicketId)} • Permit:{" "}
                  {selectedPermitId ? shortId(selectedPermitId) : "(none yet)"}
                </Text>

                <Flex gap="2" wrap="wrap">
                  <Button
                    size="2"
                    onClick={onRedeemWithPermit}
                    disabled={isPending || !selectedPermitId}
                  >
                    Redeem now
                  </Button>
                  <Button
                    size="2"
                    variant="soft"
                    color="gray"
                    onClick={() => {
                      setSelectedTicketId("");
                      setSelectedPermitId("");
                    }}
                  >
                    Clear
                  </Button>
                </Flex>
              </>
            )}
          </Flex>
        </Card>
      </Flex>
    </>
  );
}
