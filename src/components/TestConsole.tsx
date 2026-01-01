import { useEffect, useMemo, useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import {
  FaucetRateLimitError,
  getFaucetHost,
  requestSuiFromFaucetV2,
} from "@mysten/sui/faucet";

import TestConsoleView, { OwnedItem } from "./TestConsoleView";

const PLATFORM_DUMMY =
  "0xe7db9021ff53de89cd3c527fb2911be32eb22c3ec2a8b77e1ccb47ab1b0afc40";

// === Your deployed package  ===
const DEFAULT_PACKAGE_ID =
  "0xe01cdc2f8745ead1192580fa23b9e1b4d12169f9283a31936ae72f8f04bba06b";

type ObjChange = {
  type: string;
  objectType?: string;
  objectId?: string;
};

function humanizeMoveAbort(err: unknown) {
  const s = String((err as any)?.message ?? err ?? "");
  const m = s.match(/function_name:\s*Some\("([^"]+)"\)\s*}\s*,\s*(\d+)\)/);
  const fn = m?.[1];
  const code = m?.[2] ? Number(m[2]) : null;

  if (fn === "redeem" && code === 0) return "Ticket already used";
  if (fn === "redeem" && code !== null) return `redeem failed (abort ${code})`;

  return s;
}

function extractCreatedIdFromChanges(changes: ObjChange[], suffix: string) {
  const hit = changes.find(
    (c) => c.type === "created" && (c.objectType ?? "").endsWith(suffix),
  );
  return hit?.objectId ?? null;
}

function suiToMist(s: string): bigint {
  const [a, b = ""] = s.trim().split(".");
  const frac = (b + "000000000").slice(0, 9);
  return BigInt(a || "0") * 1_000_000_000n + BigInt(frac);
}

export default function TestConsle() {
  const account = useCurrentAccount();
  const client = useSuiClient();

  const [packageId, setPackageId] = useState(DEFAULT_PACKAGE_ID);

  const [eventName, setEventName] = useState("Enter Your Event Name");
  const [eventId, setEventId] = useState<string>("");
  const [capId, setCapId] = useState<string>("");
  const [ticketId, setTicketId] = useState<string>("");

  const [ownedEvents, setOwnedEvents] = useState<OwnedItem[]>([]);
  const [ownedCaps, setOwnedCaps] = useState<OwnedItem[]>([]);
  const [ownedTickets, setOwnedTickets] = useState<OwnedItem[]>([]);

  const [status, setStatus] = useState<string>("");
  const [lastDigest, setLastDigest] = useState<string>("");
  const [ticketUsed, setTicketUsed] = useState<boolean | null>(null);

  const [priceSui, setPriceSui] = useState("0.1");
  const [feeBps, setFeeBps] = useState("300");
  const [platformAddr, setPlatformAddr] = useState(PLATFORM_DUMMY);

  const targets = useMemo(() => {
    const base = `${packageId}::ticket`;
    return {
      createEvent: `${base}::create_event`,
      buyTicket: `${base}::buy_ticket`,
      redeem: `${base}::redeem`,
    };
  }, [packageId]);

  const { mutate: signAndExecuteTransaction, isPending } =
    useSignAndExecuteTransaction({
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

  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function refreshOwnedWithRetry(times = 3) {
    for (let i = 0; i < times; i++) {
      try {
        await refreshOwned();
        return;
      } catch {}
      await sleep(250 + i * 150);
    }
    await refreshOwned();
  }

  async function refreshOwned() {
    if (!account?.address) {
      setStatus("請先 connect wallet");
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

    const pkgPrefix = `${packageId}::ticket::`;

    const evs: OwnedItem[] = [];
    const caps: OwnedItem[] = [];
    const tks: OwnedItem[] = [];

    for (const it of all) {
      const id = (it.data as any)?.objectId;
      const type = (it.data as any)?.type as string | undefined;
      if (!id || !type) continue;
      if (!type.startsWith(pkgPrefix)) continue;

      const fields = (it.data as any)?.content?.fields;

      if (type.endsWith("::Event")) {
        const name = fields?.name ? String(fields.name) : "";
        evs.push({ id, type, extra: name });
      } else if (type.endsWith("::GateCap")) {
        const eid = fields?.event_id ? String(fields.event_id) : "";
        caps.push({ id, type, extra: eid });
      } else if (type.endsWith("::Ticket")) {
        const used = fields?.used;
        const eid = fields?.event_id ? String(fields.event_id) : "";
        tks.push({
          id,
          type,
          used: typeof used === "boolean" ? used : undefined,
          extra: eid,
        });
      }
    }

    setOwnedEvents(evs);
    setOwnedCaps(caps);
    setOwnedTickets(tks);

    setStatus(
      `✅ refreshed. events=${evs.length}, caps=${caps.length}, tickets=${tks.length}`,
    );
  }

  async function waitTxStatusCompat(digest: string) {
    const maybeWait = (client as any).waitForTransactionBlock;
    if (typeof maybeWait === "function") {
      const txb = await (client as any).waitForTransactionBlock({
        digest,
        options: { showEffects: true, showObjectChanges: true },
      });

      const status = (txb as any)?.effects?.status?.status as
        | "success"
        | "failure"
        | undefined;
      const error = (txb as any)?.effects?.status?.error as string | undefined;
      const objectChanges = ((txb as any)?.objectChanges ?? []) as any[];

      return { status, error, objectChanges };
    }

    for (let i = 0; i < 25; i++) {
      try {
        const txb = await client.getTransactionBlock({
          digest,
          options: { showEffects: true, showObjectChanges: true },
        });

        const status = (txb as any)?.effects?.status?.status as
          | "success"
          | "failure"
          | undefined;

        if (status) {
          const error = (txb as any)?.effects?.status?.error as
            | string
            | undefined;
          const objectChanges = ((txb as any)?.objectChanges ?? []) as any[];
          return { status, error, objectChanges };
        }
      } catch {}

      await sleep(250 + i * 50);
    }

    throw new Error(
      "Timed out waiting for transaction status (RPC not ready).",
    );
  }

  async function lookupTicketAndUpdate(id: string) {
    const obj = await client.getObject({ id, options: { showContent: true } });
    const used = (obj as any)?.data?.content?.fields?.used;
    setTicketUsed(typeof used === "boolean" ? used : null);
  }

  async function onFaucet() {
    if (!account?.address) {
      setStatus("Please connect your wallet first");
      return;
    }
    setStatus("Requesting faucet (testnet)...");
    setLastDigest("");

    try {
      await requestSuiFromFaucetV2({
        host: getFaucetHost("testnet"),
        recipient: account.address,
      });
      setStatus(
        "✅ Faucet request sent. Rate limit is possible, please check your balance.",
      );
    } catch (e: any) {
      if (
        e instanceof FaucetRateLimitError ||
        String(e?.message ?? e).includes("Too many requests")
      ) {
        setStatus(
          [
            "❌ Faucet rate-limited (Too many requests).",
            "Alternative solutions:",
            "1) https://faucet.sui.io (select Testnet)",
            "2) Ask someone to transfer you a little testnet SUI",
          ].join("\n"),
        );
        return;
      }
      setStatus(`❌ Faucet failed: ${e?.message ?? String(e)}`);
    }
  }

  function onCreateEvent() {
    if (!account?.address) {
      setStatus("Please connect your wallet first");
      return;
    }

    const priceMist = suiToMist(priceSui);
    const fee = Number(feeBps);

    setStatus("Creating Event + GateCap...");
    setLastDigest("");

    const tx = new Transaction();
    tx.setGasBudget(20_000_000);

    tx.moveCall({
      target: targets.createEvent,
      arguments: [
        tx.pure.string(eventName),
        tx.pure.u64(priceMist),
        tx.pure.u16(fee),
        tx.pure.address(platformAddr),
      ],
    });

    signAndExecuteTransaction(
      { transaction: tx, chain: "sui:testnet" },
      {
        onSuccess: async (res) => {
          setLastDigest(res.digest);

          let r;
          try {
            r = await waitTxStatusCompat(res.digest);
          } catch (e: any) {
            setStatus(
              `⚠️ create_event sent, but failed to fetch tx status: ${e?.message ?? String(e)}`,
            );
            return;
          }

          if (r.status !== "success") {
            setStatus(`❌ create_event failed: ${r.error ?? "Unknown error"}`);
            return;
          }

          const newCap = extractCreatedIdFromChanges(
            r.objectChanges,
            "::ticket::GateCap",
          );
          const newEvent = extractCreatedIdFromChanges(
            r.objectChanges,
            "::ticket::Event",
          );

          if (newEvent) setEventId(newEvent);
          if (newCap) setCapId(newCap);

          setStatus(
            `✅ create_event success. ${newEvent ? "EventId auto-filled." : ""} ${newCap ? "CapId auto-filled." : ""}`,
          );
        },
        onError: (err) => setStatus(`❌ create_event failed: ${String(err)}`),
      },
    );
  }

  function onBuyTicket() {
    if (!account?.address) {
      setStatus("Please connect your wallet first");
      return;
    }
    if (!eventId) {
      setStatus("Please create an event first");
      return;
    }

    const priceMist = suiToMist(priceSui);

    setStatus("Buying Ticket (paid)...");
    setLastDigest("");

    const tx = new Transaction();
    tx.setGasBudget(30_000_000);

    const [payCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(priceMist)]);

    tx.moveCall({
      target: targets.buyTicket,
      arguments: [
        tx.object(eventId),
        payCoin,
        tx.pure.address(account.address),
      ],
    });

    signAndExecuteTransaction(
      { transaction: tx, chain: "sui:testnet" },
      {
        onSuccess: async (res) => {
          setLastDigest(res.digest);
          const r = await waitTxStatusCompat(res.digest);
          if (r.status !== "success") {
            setStatus(`❌ buy_ticket failed: ${r.error ?? "Unknown error"}`);
            return;
          }

          const newTicket = extractCreatedIdFromChanges(
            r.objectChanges,
            "::ticket::Ticket",
          );
          if (newTicket) setTicketId(newTicket);

          await refreshOwnedWithRetry(3);

          setStatus(
            `✅ buy_ticket success. ${newTicket ? "TicketId auto-filled." : ""}`,
          );
        },
        onError: (err) => setStatus(`❌ buy_ticket failed: ${String(err)}`),
      },
    );
  }

  function onRedeem() {
    if (!account?.address) {
      setStatus("Please connect your wallet first");
      return;
    }
    if (!ticketId || !capId) {
      setStatus("Please fill in Ticket ID + GateCap ID");
      return;
    }

    setStatus("Redeeming (check-in) ...");
    setLastDigest("");

    const tx = new Transaction();
    tx.setGasBudget(20_000_000);
    tx.moveCall({
      target: targets.redeem,
      arguments: [tx.object(ticketId), tx.object(capId)],
    });

    signAndExecuteTransaction(
      { transaction: tx, chain: "sui:testnet" },
      {
        onSuccess: async (res) => {
          setLastDigest(res.digest);

          let r;
          try {
            r = await waitTxStatusCompat(res.digest);
          } catch (e: any) {
            setStatus(
              `⚠️ redeem sent, but failed to fetch tx status: ${e?.message ?? String(e)}`,
            );
            try {
              await lookupTicketAndUpdate(ticketId);
              setOwnedTickets((prev) =>
                prev.map((t) => (t.id === ticketId ? { ...t, used: true } : t)),
              );
            } catch {}
            return;
          }

          if (r.status !== "success") {
            setStatus(
              `❌ redeem failed: ${humanizeMoveAbort(r.error ?? "Unknown error")}`,
            );
            try {
              await lookupTicketAndUpdate(ticketId);
            } catch {}
            return;
          }

          setStatus("✅ redeem success. Updating UI...");

          // optimistic UI
          setTicketUsed(true);
          setOwnedTickets((prev) =>
            prev.map((t) => (t.id === ticketId ? { ...t, used: true } : t)),
          );

          // authoritative lookup
          try {
            await lookupTicketAndUpdate(ticketId);
          } catch {}

          // refresh owned (with retry)
          try {
            await refreshOwnedWithRetry(3);
            setStatus("✅ redeem success. Owned refreshed.");
          } catch (e: any) {
            setStatus(
              `✅ redeem success. But refresh owned failed: ${e?.message ?? String(e)}`,
            );
          }
        },

        onError: async (err) => {
          setStatus(`❌ redeem failed: ${String(err)}`);
          try {
            await lookupTicketAndUpdate(ticketId);
          } catch {}
        },
      },
    );
  }

  async function onLookupTicket() {
    if (!ticketId) {
      setStatus("Please fill in Ticket ID");
      return;
    }
    setStatus("Looking up ticket...");
    setLastDigest("");

    try {
      await lookupTicketAndUpdate(ticketId);
      setStatus("✅ lookup done.");
    } catch (e: any) {
      setStatus(`❌ lookup failed: ${e?.message ?? String(e)}`);
    }
  }

  // optional: auto-refresh owned when wallet connects or package changes
  useEffect(() => {
    if (!account?.address) return;
    refreshOwnedWithRetry(2).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address, packageId]);

  return (
    <TestConsoleView
      address={account?.address}
      packageId={packageId}
      setPackageId={setPackageId}
      eventName={eventName}
      setEventName={setEventName}
      eventId={eventId}
      setEventId={setEventId}
      capId={capId}
      setCapId={setCapId}
      ticketId={ticketId}
      setTicketId={setTicketId}
      priceSui={priceSui}
      setPriceSui={setPriceSui}
      feeBps={feeBps}
      setFeeBps={setFeeBps}
      platformAddr={platformAddr}
      setPlatformAddr={setPlatformAddr}
      isPending={isPending}
      status={status}
      lastDigest={lastDigest}
      ticketUsed={ticketUsed}
      ownedEvents={ownedEvents}
      ownedCaps={ownedCaps}
      ownedTickets={ownedTickets}
      onFaucet={onFaucet}
      onCreateEvent={onCreateEvent}
      onBuyTicket={onBuyTicket}
      onRedeem={onRedeem}
      onLookupTicket={onLookupTicket}
      refreshOwned={refreshOwnedWithRetry}
    />
  );
}
