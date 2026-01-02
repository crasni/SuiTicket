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
import { CURRENT_PACKAGE_ID, TARGETS } from "../config/contracts";

type TicketRow = { id: string; used?: boolean; eventId?: string };
type PermitRow = { id: string; ticketId?: string; eventId?: string };

export default function MyTickets() {
  const account = useCurrentAccount();
  const client = useSuiClient();

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [permits, setPermits] = useState<PermitRow[]>([]);
  const [selectedTicket, setSelectedTicket] = useState("");
  const [selectedPermit, setSelectedPermit] = useState("");
  const [expandedQR, setExpandedQR] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const pkgPrefix = useMemo(() => `${CURRENT_PACKAGE_ID}::ticket::`, []);

  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) => {
      return await client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showEffects: true,
          showObjectChanges: true,
          showEvents: true,
        },
      });
    },
  });

  async function refresh() {
    if (!account?.address) {
      setStatus("Please connect wallet first.");
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
      const id = (it.data as any)?.objectId;
      const type = (it.data as any)?.type as string | undefined;
      if (!id || !type) continue;
      if (!type.startsWith(pkgPrefix)) continue;

      const fields = (it.data as any)?.content?.fields;

      if (type.endsWith("::Ticket")) {
        tks.push({
          id,
          used: typeof fields?.used === "boolean" ? fields.used : undefined,
          eventId: fields?.event_id ? String(fields.event_id) : undefined,
        });
      } else if (type.endsWith("::RedeemPermit")) {
        ps.push({
          id,
          ticketId: fields?.ticket_id ? String(fields.ticket_id) : undefined,
          eventId: fields?.event_id ? String(fields.event_id) : undefined,
        });
      }
    }

    setTickets(tks);
    setPermits(ps);

    // Keep selection stable, else pick first ticket
    const nextTicket = selectedTicket || tks[0]?.id || "";
    setSelectedTicket(nextTicket);

    // Auto-pick permit that matches selected ticket
    const matching = ps.filter((p) => p.ticketId === nextTicket);
    const nextPermit =
      matching.find((p) => p.id === selectedPermit)?.id ||
      matching[0]?.id ||
      "";
    setSelectedPermit(nextPermit);

    setStatus(`✅ refreshed. tickets=${tks.length}, permits=${ps.length}`);
  }

  useEffect(() => {
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address]);

  const matchingPermits = useMemo(() => {
    return permits.filter((p) => p.ticketId === selectedTicket);
  }, [permits, selectedTicket]);

  function redeemWithPermit() {
    if (!account?.address) return setStatus("Please connect wallet first.");
    if (!selectedTicket) return setStatus("Select a ticket first.");
    if (!selectedPermit) return setStatus("No matching permit selected.");

    setStatus("Redeeming with permit...");

    const tx = new Transaction();
    tx.setGasBudget(30_000_000);

    tx.moveCall({
      target: TARGETS.redeemWithPermit,
      arguments: [tx.object(selectedTicket), tx.object(selectedPermit)],
    });

    signAndExecute(
      { transaction: tx, chain: "sui:testnet" },
      {
        onSuccess: async () => {
          setStatus("✅ redeem_with_permit success.");
          await refresh();
        },
        onError: (err) =>
          setStatus(`❌ redeem_with_permit failed: ${String(err)}`),
      },
    );
  }

  return (
    <Flex direction="column" gap="4">
      <PageHeader
        title="My Tickets"
        subtitle="Show a ticket QR to staff. Staff issues a permit. Then redeem here."
      />

      <Card>
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Text style={{ opacity: 0.8, wordBreak: "break-all" }}>
            {account?.address ? (
              <>
                Connected: <Text weight="medium">{account.address}</Text>
              </>
            ) : (
              "Please connect wallet first."
            )}
          </Text>

          <Button
            variant="soft"
            onClick={refresh}
            disabled={isPending || !account?.address}
          >
            Refresh
          </Button>
        </Flex>

        {status ? (
          <Text
            size="2"
            style={{ marginTop: 10, whiteSpace: "pre-wrap", opacity: 0.85 }}
          >
            {status}
          </Text>
        ) : null}
      </Card>

      <Flex direction="column" gap="2">
        <Text weight="medium">Tickets</Text>

        {tickets.length === 0 ? (
          <EmptyState
            title="No tickets"
            desc="Buy a ticket from an event first."
          />
        ) : (
          <Flex direction="column" gap="2">
            {tickets.map((t) => (
              <Card key={t.id}>
                <Flex direction="column" gap="3">
                  <Text style={{ wordBreak: "break-all", opacity: 0.85 }}>
                    {t.id}
                  </Text>

                  <Flex align="center" justify="between" wrap="wrap" gap="2">
                    <Text size="2" color="gray">
                      used: {String(t.used ?? false)}
                    </Text>

                    <Flex gap="2">
                      <Button
                        variant={selectedTicket === t.id ? "solid" : "soft"}
                        onClick={() => {
                          setSelectedTicket(t.id);
                          // when switching ticket, pick the first matching permit
                          const next =
                            permits.filter((p) => p.ticketId === t.id)[0]?.id ||
                            "";
                          setSelectedPermit(next);
                        }}
                        disabled={isPending}
                      >
                        {selectedTicket === t.id ? "Selected" : "Select"}
                      </Button>

                      <Button
                        variant="soft"
                        onClick={() =>
                          setExpandedQR((cur) => (cur === t.id ? null : t.id))
                        }
                        disabled={isPending}
                      >
                        {expandedQR === t.id ? "Hide QR" : "Show QR"}
                      </Button>
                    </Flex>
                  </Flex>

                  {expandedQR === t.id ? (
                    <Card style={{ width: "fit-content" }}>
                      <Flex direction="column" gap="2" align="center">
                        <Text size="2" color="gray">
                          Scan this Ticket ID
                        </Text>
                        <QRCodeSVG value={t.id} size={180} />
                      </Flex>
                    </Card>
                  ) : null}
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </Flex>

      <Flex direction="column" gap="2">
        <Text weight="medium">Permits for selected ticket</Text>

        {!selectedTicket ? (
          <EmptyState
            title="No ticket selected"
            desc="Select a ticket above first."
          />
        ) : matchingPermits.length === 0 ? (
          <EmptyState
            title="No permit yet"
            desc="Ask staff to issue a permit after scanning your ticket QR."
          />
        ) : (
          <Card>
            <Flex direction="column" gap="3">
              <Text size="2" color="gray">
                Select one matching permit, then redeem (permit will be
                consumed).
              </Text>

              <select
                value={selectedPermit}
                onChange={(e) => setSelectedPermit(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "inherit",
                }}
              >
                {matchingPermits.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id}
                  </option>
                ))}
              </select>

              <Button
                onClick={redeemWithPermit}
                disabled={isPending || !selectedPermit}
              >
                Redeem with Permit
              </Button>
            </Flex>
          </Card>
        )}
      </Flex>
    </Flex>
  );
}
