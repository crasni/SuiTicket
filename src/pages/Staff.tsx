// src/pages/Staff.tsx
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Flex, Text, TextField } from "@radix-ui/themes";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { CURRENT_PACKAGE_ID, TARGETS } from "../config/contracts";

type Lookup = {
  ok: boolean;
  reason?: string;
  owner?: string; // attendee address
  used?: boolean;
  type?: string;
  eventId?: string;
};

type CapRow = { id: string; eventId?: string };

function isAddressOwner(owner: any): owner is { AddressOwner: string } {
  return owner && typeof owner === "object" && "AddressOwner" in owner;
}

async function copyToClipboard(s: string) {
  try {
    await navigator.clipboard.writeText(s);
  } catch {
    // ignore
  }
}

export default function Staff() {
  const account = useCurrentAccount();
  const client = useSuiClient();

  const [caps, setCaps] = useState<CapRow[]>([]);
  const [capId, setCapId] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);

  const [status, setStatus] = useState<string>("");
  const [permitId, setPermitId] = useState<string>("");
  const [lastDigest, setLastDigest] = useState<string>("");

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

  async function refreshCaps() {
    if (!account?.address) {
      setStatus("Please connect staff wallet first.");
      return;
    }
    setStatus("Refreshing GateCaps...");

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

    const out: CapRow[] = [];
    for (const it of all) {
      const id = (it.data as any)?.objectId;
      const type = (it.data as any)?.type as string | undefined;
      if (!id || !type) continue;
      if (!type.startsWith(pkgPrefix)) continue;
      if (!type.endsWith("::GateCap")) continue;

      const fields = (it.data as any)?.content?.fields;
      out.push({
        id,
        eventId: fields?.event_id ? String(fields.event_id) : undefined,
      });
    }

    setCaps(out);
    setStatus(`✅ GateCaps refreshed: ${out.length}`);
    if (!capId && out[0]?.id) setCapId(out[0].id);
  }

  async function onLookup() {
    const id = ticketId.trim();
    if (!id) return;

    setStatus("Looking up ticket...");
    setPermitId("");
    setLastDigest("");
    setLookup(null);

    try {
      const obj = await client.getObject({
        id,
        options: { showType: true, showOwner: true, showContent: true },
      });

      const type = (obj as any)?.data?.type as string | undefined;
      const owner = (obj as any)?.data?.owner;
      const fields = (obj as any)?.data?.content?.fields;

      if (!type || !type.startsWith(pkgPrefix) || !type.endsWith("::Ticket")) {
        setLookup({
          ok: false,
          reason: `Not a NEW Ticket. Got type=${type ?? "(none)"}`,
          type: type ?? "(none)",
        });
        setStatus("❌ This is not a Ticket from the NEW package.");
        return;
      }

      if (!isAddressOwner(owner)) {
        setLookup({
          ok: false,
          reason: "Ticket is not AddressOwner (unexpected owner kind).",
        });
        setStatus("❌ Ticket owner is not an address (unexpected).");
        return;
      }

      const used = fields?.used;
      const eventId = fields?.event_id ? String(fields.event_id) : undefined;

      setLookup({
        ok: true,
        owner: owner.AddressOwner,
        used: typeof used === "boolean" ? used : undefined,
        eventId,
        type,
      });

      setStatus("✅ Lookup OK. You can issue a permit.");
    } catch (e: any) {
      setLookup({ ok: false, reason: e?.message ?? String(e) });
      setStatus(`❌ Lookup failed: ${e?.message ?? String(e)}`);
    }
  }

  function extractCreatedPermitId(objectChanges: any[]): string {
    const hit = (objectChanges ?? []).find(
      (c) =>
        c.type === "created" &&
        typeof c.objectType === "string" &&
        c.objectType.endsWith("::RedeemPermit"),
    );
    return hit?.objectId ?? "";
  }

  function onIssuePermit() {
    if (!account?.address) return setStatus("Please connect staff wallet.");
    if (!capId.trim() || !ticketId.trim())
      return setStatus("Fill GateCap ID + Ticket ID.");
    if (!lookup?.ok || !lookup.owner)
      return setStatus("Run lookup first (need ticket owner).");
    if (lookup.used)
      return setStatus("Ticket already used — do not issue permit.");

    setStatus("Issuing permit...");
    setPermitId("");
    setLastDigest("");

    const tx = new Transaction();
    tx.setGasBudget(30_000_000);

    tx.moveCall({
      target: TARGETS.issuePermit,
      arguments: [
        tx.object(capId.trim()),
        // issue_permit expects ID; passing address-form often works for ID.
        tx.pure.address(ticketId.trim()),
        tx.pure.address(lookup.owner),
      ],
    });

    signAndExecute(
      { transaction: tx, chain: "sui:testnet" },
      {
        onSuccess: (res) => {
          setLastDigest(res.digest);
          const changes = (res as any)?.objectChanges ?? [];
          const pid = extractCreatedPermitId(changes);
          if (pid) setPermitId(pid);
          setStatus(
            pid
              ? "✅ Permit issued."
              : "✅ Permit issued (permitId not auto-detected).",
          );
        },
        onError: (err) => setStatus(`❌ issue_permit failed: ${String(err)}`),
      },
    );
  }

  // Auto-refresh caps when wallet connects
  useEffect(() => {
    if (!account?.address) return;
    refreshCaps().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address]);

  return (
    <Flex direction="column" gap="4">
      <PageHeader
        title="Staff"
        subtitle="Pick a GateCap you own, paste Ticket ID, lookup owner, then issue a one-time permit."
      />

      <Card>
        <Flex direction="column" gap="3">
          <Flex align="center" justify="between" wrap="wrap" gap="2">
            <Text weight="medium">My GateCaps</Text>
            <Button
              variant="soft"
              onClick={refreshCaps}
              disabled={isPending || !account?.address}
            >
              Refresh
            </Button>
          </Flex>

          {caps.length === 0 ? (
            <EmptyState
              title="No GateCaps found"
              desc="If you created an event on the NEW package, you should see its GateCap here."
            />
          ) : (
            <Flex direction="column" gap="2">
              {caps.map((c) => (
                <Card key={c.id}>
                  <Flex align="center" justify="between" gap="3" wrap="wrap">
                    <Flex
                      direction="column"
                      gap="1"
                      style={{ minWidth: 280, flex: 1 }}
                    >
                      <Text style={{ wordBreak: "break-all", opacity: 0.85 }}>
                        {c.id}
                      </Text>
                      <Text
                        size="2"
                        color="gray"
                        style={{ wordBreak: "break-all" }}
                      >
                        event_id: {c.eventId ?? "-"}
                      </Text>
                    </Flex>

                    <Flex gap="2">
                      <Button
                        variant={capId === c.id ? "solid" : "soft"}
                        onClick={() => setCapId(c.id)}
                      >
                        {capId === c.id ? "Using" : "Use"}
                      </Button>
                      <Button
                        variant="ghost"
                        color="gray"
                        onClick={() => copyToClipboard(c.id)}
                      >
                        Copy
                      </Button>
                    </Flex>
                  </Flex>
                </Card>
              ))}
            </Flex>
          )}
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="3">
          <Text weight="medium">Issue permit</Text>

          <Text size="2" color="gray">
            Using GateCap:
          </Text>
          <Text style={{ wordBreak: "break-all", opacity: 0.85 }}>
            {capId || "(not selected)"}
          </Text>

          <Text size="2" color="gray">
            Ticket ID (from attendee QR)
          </Text>

          <Flex gap="2" wrap="wrap">
            <TextField.Root
              placeholder="0x... Ticket object id"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              style={{ flex: 1, minWidth: 320 }}
            />

            <Button
              variant="soft"
              onClick={onLookup}
              disabled={isPending || !ticketId.trim()}
            >
              Lookup
            </Button>

            <Button onClick={onIssuePermit} disabled={isPending || !lookup?.ok}>
              Issue
            </Button>
          </Flex>

          {status ? (
            <Text size="2" style={{ whiteSpace: "pre-wrap", opacity: 0.85 }}>
              {status}
            </Text>
          ) : null}

          {lookup?.ok ? (
            <Card>
              <Flex direction="column" gap="2">
                <Text size="2" color="gray">
                  Lookup result
                </Text>
                <Text style={{ wordBreak: "break-all", opacity: 0.85 }}>
                  Owner: {lookup.owner}
                </Text>
                <Text style={{ wordBreak: "break-all", opacity: 0.85 }}>
                  Event: {lookup.eventId ?? "-"}
                </Text>
                <Text style={{ opacity: 0.85 }}>
                  Used: {String(lookup.used ?? false)}
                </Text>

                {permitId ? (
                  <>
                    <Text size="2" color="gray" style={{ marginTop: 8 }}>
                      Permit created
                    </Text>
                    <Text style={{ wordBreak: "break-all", opacity: 0.85 }}>
                      Permit ID: {permitId}
                    </Text>
                    <Text
                      size="2"
                      color="gray"
                      style={{ wordBreak: "break-all" }}
                    >
                      Tx: {lastDigest}
                    </Text>
                  </>
                ) : null}
              </Flex>
            </Card>
          ) : null}
        </Flex>
      </Card>
    </Flex>
  );
}
