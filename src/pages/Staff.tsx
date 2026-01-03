import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import QrScanModal from "../components/QrScanModal";
import Surface from "../components/Surface";
import CopyPill from "../components/CopyPill";
import { copyText, readText } from "../lib/clipboard";
import { CURRENT_PACKAGE_ID, TARGETS } from "../config/contracts";
import { useEventNames } from "../hooks/useEventNames";
import { toast } from "../lib/toast";

type Lookup = {
  ok: boolean;
  reason?: string;
  owner?: string;
  used?: boolean;
  type?: string;
  eventId?: string;
};

type CapRow = { id: string; eventId?: string };

const STAFF_SELECTED_CAP_KEY = "suiticket.staff.selectedCapId";

function saveSelectedCapId(id: string) {
  try {
    localStorage.setItem(STAFF_SELECTED_CAP_KEY, id);
  } catch {}
}

function loadSelectedCapId(): string {
  try {
    return localStorage.getItem(STAFF_SELECTED_CAP_KEY) ?? "";
  } catch {
    return "";
  }
}

function suiscanObjectUrl(id: string) {
  return `https://suiscan.xyz/testnet/object/${id}`;
}

function isAddressOwner(owner: any): owner is { AddressOwner: string } {
  return owner && typeof owner === "object" && "AddressOwner" in owner;
}

function shortId(id?: string) {
  if (!id) return "-";
  const s = id.trim();
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export default function Staff() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const nav = useNavigate();

  const [capId, setCapId] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);

  const [status, setStatus] = useState<string>("");
  const [permitId, setPermitId] = useState<string>("");
  const [lastDigest, setLastDigest] = useState<string>("");

  const [caps, setCaps] = useState<CapRow[]>([]);
  const [scanOpen, setScanOpen] = useState(false);
  const [capDetails, setCapDetails] = useState<Record<string, boolean>>({});
  const [showResultDetails, setShowResultDetails] = useState(false);

  const eventIdsForNames = useMemo(
    () => [...caps.map((c) => c.eventId), lookup?.eventId],
    [caps, lookup?.eventId],
  );
  const eventNameMap = useEventNames(eventIdsForNames);

  const pkgPrefix = useMemo(() => `${CURRENT_PACKAGE_ID}::ticket::`, []);
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

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

  async function refreshCaps() {
    if (!account?.address) return;

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
      const id = (it.data as any)?.objectId as string | undefined;
      const type = (it.data as any)?.type as string | undefined;
      if (!id || !type) continue;
      if (!type.startsWith(pkgPrefix) || !type.endsWith("::GateCap")) continue;

      const fields = (it.data as any)?.content?.fields;
      const eventId = fields?.event_id ? String(fields.event_id) : undefined;
      out.push({ id, eventId });
    }

    setCaps(out);
    const saved = loadSelectedCapId();
    const hasSaved = saved && out.some((x) => x.id === saved);

    if (!capId) {
      if (hasSaved) setCapId(saved);
      else if (out[0]?.id) setCapId(out[0].id);
    } else {
      const stillValid = out.some((x) => x.id === capId);
      if (!stillValid) {
        if (hasSaved) setCapId(saved);
        else if (out[0]?.id) setCapId(out[0].id);
      }
    }
  }

  useEffect(() => {
    refreshCaps().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address]);

  function onScanned(text: string) {
    const clean = text.trim();
    const id = clean.startsWith("ticket:")
      ? clean.slice("ticket:".length)
      : clean;

    setTicketId(id.trim());
    setLookup(null);
    setShowResultDetails(false);
    setPermitId("");
    setLastDigest("");
    toast.success("Scan success", "Ticket ID filled.");
    setStatus("✅ Scanned. Click Lookup.");
  }

  async function onLookup() {
    const id = ticketId.trim();
    if (!id) return;

    setStatus("Looking up ticket...");
    setPermitId("");
    setLastDigest("");
    setLookup(null);
    setShowResultDetails(false);

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
          reason: `Not a Ticket from the CURRENT package. Got type=${type ?? "(none)"}`,
          type: type ?? "(none)",
        });
        setStatus("❌ This is not a Ticket from the CURRENT package.");
        return;
      }

      if (!isAddressOwner(owner)) {
        setLookup({ ok: false, reason: "Ticket is not AddressOwner." });
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
        tx.pure.address(ticketId.trim()),
        tx.pure.address(lookup.owner),
      ],
    });

    signAndExecute(
      { transaction: tx, chain: "sui:testnet" },
      {
        onSuccess: async (res) => {
          setLastDigest(res.digest);

          try {
            const txb = await waitTx(res.digest);
            const changes = ((txb as any)?.objectChanges ?? []) as any[];
            const pid = extractCreatedPermitId(changes);
            if (pid) setPermitId(pid);
            toast.success("Permit issued", pid ? `Permit: ${pid}` : undefined);
            setStatus("✅ Permit issued.");
          } catch (e: any) {
            setStatus(
              `✅ Permit issued, but couldn't load object changes: ${
                e?.message ?? String(e)
              }`,
            );
          }
        },
        onError: (err) => {
          toast.error("Issue permit failed", String(err));
          setStatus(`❌ issue_permit failed: ${String(err)}`);
        },
      },
    );
  }

  async function onPasteTicketId() {
    const t = await readText();
    if (!t) {
      toast.error("Can't paste", "Clipboard is empty / not permitted.");
      return setStatus("Clipboard is empty / not permitted.");
    }
    setTicketId(t.trim());
    setLookup(null);
    setShowResultDetails(false);
    setPermitId("");
    setLastDigest("");
    toast.success("Pasted", "Ticket ID filled.");
    setStatus("✅ Pasted from clipboard. Click Lookup.");
  }

  return (
    <>
      <QrScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={onScanned}
        title="Scan attendee QR"
        hint="Point camera at attendee's ticket QR. We'll fill Ticket ID."
      />

      <Flex direction="column" gap="4">
        <PageHeader
          title="Staff"
          subtitle="Pick a GateCap, scan/paste ticket ID, lookup, then issue a one-time permit."
          right={
            <>
              <Button
                size="2"
                variant="soft"
                color="gray"
                onClick={() => nav("/staff/events")}
              >
                Manage events
              </Button>
              <Button
                size="2"
                variant="soft"
                onClick={() => refreshCaps()}
                disabled={!account?.address || isPending}
              >
                Refresh
              </Button>
            </>
          }
        />

        <Surface>
          <Flex direction="column" gap="3">
            <Text weight="medium">Your GateCaps</Text>

            {caps.length === 0 ? (
              <EmptyState
                title="No GateCap found"
                desc="Connect the staff wallet that holds the GateCap."
              />
            ) : (
              <Flex direction="column" gap="2">
                {caps.map((c) => (
                  <Surface key={c.id}>
                    <Flex align="center" justify="between" gap="3" wrap="wrap">
                      <Flex
                        direction="column"
                        gap="1"
                        style={{ minWidth: 260 }}
                      >
                        <Text
                          size="2"
                          style={{ wordBreak: "break-all", opacity: 0.85 }}
                        >
                          Cap: {shortId(c.id)}
                        </Text>
                        <Text
                          size="2"
                          style={{ wordBreak: "break-all", opacity: 0.7 }}
                        >
                          Event:{" "}
                          {c.eventId
                            ? (eventNameMap[c.eventId] ?? shortId(c.eventId))
                            : "-"}
                        </Text>
                      </Flex>

                      <Flex gap="2" wrap="wrap">
                        <Button
                          size="2"
                          className="st-pillBtn"
                          variant={capId === c.id ? "solid" : "soft"}
                          onClick={() => {
                            setCapId(c.id);
                            saveSelectedCapId(c.id);
                          }}
                        >
                          {capId === c.id ? "Using" : "Use"}
                        </Button>

                        <CopyPill value={c.id} size="2" />

                        <Button
                          size="2"
                          variant="soft"
                          color="gray"
                          className="st-pillBtn"
                          onClick={() =>
                            setCapDetails((m) => ({
                              ...m,
                              [c.id]: !m[c.id],
                            }))
                          }
                        >
                          {capDetails[c.id] ? "Hide details" : "Details"}
                        </Button>
                      </Flex>
                    </Flex>

                    {capDetails[c.id] ? (
                      <Surface dense style={{ marginTop: 12 }}>
                        <Flex direction="column" gap="2">
                          <Text size="2" color="gray">
                            GateCap details
                          </Text>

                          <Text
                            size="2"
                            style={{ wordBreak: "break-all", opacity: 0.85 }}
                          >
                            <Text weight="medium">Cap ID:</Text> {c.id}{" "}
                            <Button
                              size="1"
                              variant="soft"
                              color="gray"
                              style={{ marginLeft: 8 }}
                              onClick={() => copyText(c.id)}
                            >
                              Copy
                            </Button>{" "}
                            <a
                              href={suiscanObjectUrl(c.id)}
                              target="_blank"
                              rel="noreferrer"
                              style={{ marginLeft: 10 }}
                            >
                              Open
                            </a>
                          </Text>

                          <Text
                            size="2"
                            style={{ wordBreak: "break-all", opacity: 0.85 }}
                          >
                            <Text weight="medium">Event ID:</Text>{" "}
                            {c.eventId ?? "-"}
                            {c.eventId ? (
                              <>
                                <Button
                                  size="1"
                                  variant="soft"
                                  color="gray"
                                  style={{ marginLeft: 8 }}
                                  onClick={() => copyText(c.eventId!)}
                                >
                                  Copy
                                </Button>
                                <a
                                  href={suiscanObjectUrl(c.eventId)}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ marginLeft: 10 }}
                                >
                                  Open
                                </a>
                              </>
                            ) : null}
                          </Text>

                          <Text size="2" style={{ opacity: 0.75 }}>
                            <Text weight="medium">Owner:</Text>{" "}
                            {account?.address ?? "-"}
                            {account?.address ? (
                              <Button
                                size="1"
                                variant="soft"
                                color="gray"
                                style={{ marginLeft: 8 }}
                                onClick={() => copyText(account.address!)}
                              >
                                Copy
                              </Button>
                            ) : null}
                          </Text>
                        </Flex>
                      </Surface>
                    ) : null}
                  </Surface>
                ))}
              </Flex>
            )}
          </Flex>
        </Surface>

        <Surface>
          <Flex direction="column" gap="3">
            <Text weight="medium">Issue permit</Text>

            <Flex direction="column" gap="2">
              <Text size="2" color="gray">
                GateCap
              </Text>
              <Flex gap="2" wrap="wrap" align="center">
                <TextField.Root
                  placeholder="0x... GateCap object id"
                  value={capId}
                  onChange={(e) => setCapId(e.target.value)}
                  style={{ flex: 1, minWidth: 320 }}
                />
                {capId.trim() ? (
                  <CopyPill value={capId.trim()} label="Copy" size="2" />
                ) : null}
              </Flex>
            </Flex>

            <Flex direction="column" gap="2">
              <Text size="2" color="gray">
                Ticket ID
              </Text>
              <Flex gap="2" wrap="wrap" align="center">
                <TextField.Root
                  placeholder="0x... Ticket object id"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  style={{ flex: 1, minWidth: 320 }}
                />

                <Button
                  size="2"
                  variant="soft"
                  onClick={() => setScanOpen(true)}
                  disabled={isPending}
                >
                  Scan QR
                </Button>

                <Button
                  size="2"
                  variant="soft"
                  color="gray"
                  onClick={onPasteTicketId}
                  disabled={isPending}
                >
                  Paste
                </Button>

                {ticketId.trim() ? (
                  <CopyPill value={ticketId.trim()} label="Copy" size="2" />
                ) : null}
              </Flex>
            </Flex>

            <Flex gap="2" wrap="wrap" align="center">
              <Button
                size="2"
                variant="soft"
                onClick={onLookup}
                disabled={isPending || !ticketId.trim()}
              >
                Lookup
              </Button>
              <Button
                size="2"
                onClick={onIssuePermit}
                disabled={isPending || !lookup?.ok || !capId.trim()}
              >
                Issue Permit
              </Button>
            </Flex>

            {status ? (
              <Text size="2" style={{ whiteSpace: "pre-wrap", opacity: 0.85 }}>
                {status}
              </Text>
            ) : null}
          </Flex>
        </Surface>

        <Flex direction="column" gap="2">
          <Text weight="medium">Result</Text>

          {!lookup ? (
            <EmptyState
              title="No lookup yet"
              desc="Lookup a ticket to see owner + used status here."
            />
          ) : (
            <Surface>
              <Flex direction="column" gap="2">
                <Text size="2" color="gray">
                  Ticket info
                </Text>

                <Text style={{ wordBreak: "break-all", opacity: 0.85 }}>
                  <Text weight="medium">Owner:</Text> {lookup.owner ?? "-"}{" "}
                  {lookup.owner ? (
                    <span style={{ marginLeft: 8 }}>
                      <CopyPill value={lookup.owner!} label="Copy" size="1" />
                    </span>
                  ) : null}
                </Text>

                <Text style={{ opacity: 0.85 }}>
                  <Text weight="medium">Used:</Text>{" "}
                  {String(lookup.used ?? false)}
                </Text>

                <Flex align="center" justify="between" gap="2" wrap="wrap">
                  <Text size="2" style={{ opacity: 0.7 }}>
                    Event:{" "}
                    {lookup.eventId
                      ? (eventNameMap[lookup.eventId] ??
                        shortId(lookup.eventId))
                      : "-"}
                  </Text>
                  {lookup.eventId ? (
                    <Button
                      size="2"
                      variant="soft"
                      color="gray"
                      className="st-pillBtn"
                      onClick={() => setShowResultDetails((x) => !x)}
                    >
                      {showResultDetails ? "Hide details" : "Details"}
                    </Button>
                  ) : null}
                </Flex>

                {showResultDetails && lookup.eventId ? (
                  <Surface dense>
                    <Flex direction="column" gap="2">
                      <Text size="2" color="gray">
                        Event details
                      </Text>
                      <Text
                        size="2"
                        style={{ wordBreak: "break-all", opacity: 0.85 }}
                      >
                        <Text weight="medium">Event ID:</Text> {lookup.eventId}
                        <Button
                          size="1"
                          variant="soft"
                          color="gray"
                          style={{ marginLeft: 8 }}
                          onClick={() =>
                            copyText(lookup.eventId!, "Event ID copied")
                          }
                        >
                          Copy
                        </Button>
                      </Text>
                    </Flex>
                  </Surface>
                ) : null}

                {permitId ? (
                  <>
                    <Text size="2" color="gray" style={{ marginTop: 8 }}>
                      Permit created
                    </Text>
                    <Text style={{ wordBreak: "break-all", opacity: 0.85 }}>
                      Permit ID: {permitId}{" "}
                      <Button
                        size="1"
                        variant="soft"
                        color="gray"
                        style={{ marginLeft: 8 }}
                        onClick={() => copyText(permitId)}
                      >
                        Copy
                      </Button>
                    </Text>
                    <Text
                      size="2"
                      style={{ wordBreak: "break-all", opacity: 0.75 }}
                    >
                      Tx: {lastDigest}
                    </Text>
                  </>
                ) : null}
              </Flex>
            </Surface>
          )}
        </Flex>
      </Flex>
    </>
  );
}
