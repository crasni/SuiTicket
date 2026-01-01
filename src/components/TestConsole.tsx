import { useMemo, useState } from "react";
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

import TestConsoleView from "./TestConsoleView";

// === Your deployed package (MVP0) ===
const DEFAULT_PACKAGE_ID =
  "0x56b50e92e7e2039f10f58564dc8adfa9fe61b22337c7965066df964c60905926";

type ObjChange = {
  type: string;
  objectType?: string;
  objectId?: string;
};

type OwnedItem = { id: string; type: string; extra?: string; used?: boolean };

function suiscanObjectUrl(id: string) {
  return `https://suiscan.xyz/testnet/object/${id}`;
}
function suiscanTxUrl(digest: string) {
  return `https://suiscan.xyz/testnet/tx/${digest}`;
}

function humanizeMoveAbort(err: unknown) {
  const s = String((err as any)?.message ?? err ?? "");

  // match: function_name: Some("redeem") }, 0)
  const m = s.match(/function_name:\s*Some\("([^"]+)"\)\s*}\s*,\s*(\d+)\)/);
  const fn = m?.[1];
  const code = m?.[2] ? Number(m[2]) : null;

  if (fn === "redeem" && code === 0) return "Ticket already used (已驗票)";
  if (fn === "redeem" && code !== null) return `redeem failed (abort ${code})`;

  return s; // fallback: 原始錯誤字串
}

function extractCreatedIdFromChanges(changes: ObjChange[], suffix: string) {
  const hit = changes.find(
    (c) => c.type === "created" && (c.objectType ?? "").endsWith(suffix),
  );
  return hit?.objectId ?? null;
}

export default function TestConsle() {
  const account = useCurrentAccount();
  const client = useSuiClient();

  const [packageId, setPackageId] = useState(DEFAULT_PACKAGE_ID);

  const [eventName, setEventName] = useState("SuiStage MVP0");
  const [eventId, setEventId] = useState<string>(
    "0xa9756701919cc8937e316a2a481296c0d79c198697a86f29aa9f722d42eeee41",
  );
  const [capId, setCapId] = useState<string>(
    "0x545dba0aaf6b59266c85a2d05dd0b09989a97a5b08ac5f48a2e9a7a7d6b38d30",
  );
  const [ticketId, setTicketId] = useState<string>(
    "0x56ac8cf75a3c40ae1cd21fdcd3d9d6a4cfd0982ec6f095c47725edef66e24a33",
  );

  const [ownedEvents, setOwnedEvents] = useState<OwnedItem[]>([]);
  const [ownedCaps, setOwnedCaps] = useState<OwnedItem[]>([]);
  const [ownedTickets, setOwnedTickets] = useState<OwnedItem[]>([]);

  const [status, setStatus] = useState<string>("");
  const [lastDigest, setLastDigest] = useState<string>("");
  const [ticketUsed, setTicketUsed] = useState<boolean | null>(null);

  const targets = useMemo(() => {
    const base = `${packageId}::ticket`;
    return {
      createEvent: `${base}::create_event`,
      mintTicket: `${base}::mint_ticket`,
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

  async function refreshOwned() {
    if (!account?.address) {
      setStatus("請先 connect wallet");
      return;
    }
    setStatus("Refreshing owned objects...");

    // ✅ 把 owned objects 全部頁面抓完
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
    // 1) Newer SDK: waitForTransactionBlock exists
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

    // 2) Older SDK: poll getTransactionBlock until effects are available
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

        // 如果拿得到 status，就代表鏈上已可查
        if (status) {
          const error = (txb as any)?.effects?.status?.error as
            | string
            | undefined;
          const objectChanges = ((txb as any)?.objectChanges ?? []) as any[];
          return { status, error, objectChanges };
        }
      } catch {
        // ignore and retry
      }

      // backoff: 250ms, 300ms, ... 不要狂敲 RPC
      await sleep(250 + i * 50);
    }

    throw new Error(
      "Timed out waiting for transaction status (RPC not ready).",
    );
  }

  async function lookupTicketAndUpdate(id: string) {
    const obj = await client.getObject({
      id,
      options: { showContent: true },
    });
    const used = (obj as any)?.data?.content?.fields?.used;
    setTicketUsed(typeof used === "boolean" ? used : null);
  }

  async function onFaucet() {
    if (!account?.address) {
      setStatus("請先 connect wallet");
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
        "✅ Faucet request sent. 可能會被 rate limit，請自行確認餘額。",
      );
    } catch (e: any) {
      if (
        e instanceof FaucetRateLimitError ||
        String(e?.message ?? e).includes("Too many requests")
      ) {
        setStatus(
          [
            "❌ Faucet rate-limited (Too many requests).",
            "替代方案：",
            "1) https://faucet.sui.io (選 Testnet)",
            "2) 叫別人轉你一點 testnet SUI",
          ].join("\n"),
        );
        return;
      }
      setStatus(`❌ Faucet failed: ${e?.message ?? String(e)}`);
    }
  }

  function onCreateEvent() {
    if (!account?.address) {
      setStatus("請先 connect wallet");
      return;
    }

    setStatus("Creating Event + GateCap...");
    setLastDigest("");

    const tx = new Transaction();
    tx.setGasBudget(20_000_000);
    tx.moveCall({
      target: targets.createEvent,
      arguments: [tx.pure.string(eventName)],
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

  function onMintTicket() {
    if (!account?.address) {
      setStatus("請先 connect wallet");
      return;
    }
    if (!eventId) {
      setStatus("請先有 Event ID（先按 Create Event 或手動貼上）");
      return;
    }

    setStatus("Minting Ticket to myself...");
    setLastDigest("");

    const tx = new Transaction();
    tx.setGasBudget(20_000_000);
    tx.moveCall({
      target: targets.mintTicket,
      arguments: [tx.object(eventId), tx.pure.address(account.address)],
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
              `⚠️ mint_ticket sent, but failed to fetch tx status: ${e?.message ?? String(e)}`,
            );
            return;
          }

          if (r.status !== "success") {
            setStatus(`❌ mint_ticket failed: ${r.error ?? "Unknown error"}`);
            return;
          }

          const newTicket = extractCreatedIdFromChanges(
            r.objectChanges,
            "::ticket::Ticket",
          );
          if (newTicket) setTicketId(newTicket);

          // 盡量讓 UI 不說謊：mint 成功後立刻查一次 used
          try {
            await lookupTicketAndUpdate(newTicket ?? ticketId);
          } catch {
            setTicketUsed(false);
          }

          setStatus(
            `✅ mint_ticket success. ${newTicket ? "TicketId auto-filled." : ""}`,
          );
        },
        onError: (err) => setStatus(`❌ mint_ticket failed: ${String(err)}`),
      },
    );
  }

  function onRedeem() {
    if (!account?.address) {
      setStatus("請先 connect wallet");
      return;
    }
    if (!ticketId || !capId) {
      setStatus("請填好 Ticket ID + GateCap ID");
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
            // still refresh status if possible
            try {
              await lookupTicketAndUpdate(ticketId);
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

          // ✅ success path: auto-lookup + update used
          setStatus("✅ redeem success. Updating ticket status...");
          try {
            await lookupTicketAndUpdate(ticketId);
            setStatus("✅ redeem success. Ticket status updated.");
          } catch (e: any) {
            setStatus(
              `✅ redeem success. But lookup failed: ${e?.message ?? String(e)}`,
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
      setStatus("請先填 Ticket ID");
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
      isPending={isPending}
      status={status}
      lastDigest={lastDigest}
      ticketUsed={ticketUsed}
      ownedEvents={ownedEvents}
      ownedCaps={ownedCaps}
      ownedTickets={ownedTickets}
      onFaucet={onFaucet}
      onCreateEvent={onCreateEvent}
      onMintTicket={onMintTicket}
      onRedeem={onRedeem}
      onLookupTicket={onLookupTicket}
      refreshOwned={refreshOwned}
    />
  );
}
