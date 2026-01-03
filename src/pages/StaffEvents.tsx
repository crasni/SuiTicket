import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";

import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import Surface from "../components/Surface";
import CopyPill from "../components/CopyPill";
import { CURRENT_PACKAGE_ID } from "../config/contracts";
import { useEventNames } from "../hooks/useEventNames";

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

function shortId(id?: string) {
  if (!id) return "-";
  const s = id.trim();
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export default function StaffEvents() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const nav = useNavigate();

  const [caps, setCaps] = useState<CapRow[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [capDetails, setCapDetails] = useState<Record<string, boolean>>({});
  const [eventDetails, setEventDetails] = useState<Record<string, boolean>>({});
  const [selectedCapId, setSelectedCapId] = useState(loadSelectedCapId());

  const pkgPrefix = useMemo(() => `${CURRENT_PACKAGE_ID}::ticket::`, []);

  const eventIdsForNames = useMemo(() => caps.map((c) => c.eventId), [caps]);
  const eventNameMap = useEventNames(eventIdsForNames);

  async function refreshCaps() {
    if (!account?.address) {
      setCaps([]);
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
      const id = (it.data as any)?.objectId as string | undefined;
      const type = (it.data as any)?.type as string | undefined;
      if (!id || !type) continue;
      if (!type.startsWith(pkgPrefix) || !type.endsWith("::GateCap")) continue;

      const fields = (it.data as any)?.content?.fields;
      const eventId = fields?.event_id ? String(fields.event_id) : undefined;
      out.push({ id, eventId });
    }

    out.sort(
      (a, b) =>
        (a.eventId ?? "").localeCompare(b.eventId ?? "") ||
        a.id.localeCompare(b.id),
    );
    setCaps(out);

    // Keep selection if still valid.
    const saved = loadSelectedCapId();
    if (saved && out.some((c) => c.id === saved)) setSelectedCapId(saved);

    setStatus(`✅ GateCaps=${out.length}`);
  }

  useEffect(() => {
    refreshCaps().catch((e) => setStatus(`❌ Refresh failed: ${String(e)}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? caps
      : caps.filter((c) => {
          const evId = (c.eventId ?? "").toLowerCase();
          const evName = c.eventId
            ? (eventNameMap[c.eventId] ?? "").toLowerCase()
            : "";
          return (
            evId.includes(q) ||
            evName.includes(q) ||
            c.id.toLowerCase().includes(q)
          );
        });

    const map = new Map<string, CapRow[]>();
    for (const c of filtered) {
      const key = c.eventId ?? "(unknown)";
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }

    const entries = Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return entries;
  }, [caps, query, eventNameMap]);

  function useCap(id: string) {
    setSelectedCapId(id);
    saveSelectedCapId(id);
    setStatus("✅ Selected. Opening staff check-in...");
    nav("/staff");
  }

  return (
    <Flex direction="column" gap="4">
      <PageHeader
        title="Staff Events"
        subtitle="Manage your events (GateCaps) and choose which one to use for check-in."
        right={
          <>
            <Button
              size="2"
              variant="soft"
              color="gray"
              onClick={() => nav("/staff")}
            >
              Back
            </Button>
            <Button
              size="2"
              variant="soft"
              onClick={() => refreshCaps()}
              disabled={!account?.address}
            >
              Refresh
            </Button>
          </>
        }
      />

      <Surface>
        <Flex direction="column" gap="2">
          <Text weight="medium">Search</Text>
          <TextField.Root
            placeholder="Filter by event name, event id, or cap id..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {status ? (
            <Text size="2" style={{ opacity: 0.75, whiteSpace: "pre-wrap" }}>
              {status}
            </Text>
          ) : null}
        </Flex>
      </Surface>

      {!account?.address ? (
        <EmptyState
          title="Connect wallet"
          desc="Connect the staff wallet that holds GateCaps."
        />
      ) : caps.length === 0 ? (
        <EmptyState
          title="No GateCaps"
          desc="This wallet doesn't own any GateCaps."
        />
      ) : (
        <Flex direction="column" gap="4">
          {groups.map(([eventKey, arr]) => (
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
                    {arr.length} cap{arr.length === 1 ? "" : "s"}
                  </Text>
                  {eventKey !== "(unknown)" ? (
                    <Button
                      size="2"
                      variant="soft"
                      color="gray"
                      className="st-pillBtn"
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
                <Surface dense>
                  <Flex direction="column" gap="2">
                    <Text size="2" color="gray">
                      Event details
                    </Text>
                    <Text
                      size="2"
                      style={{ wordBreak: "break-all", opacity: 0.85 }}
                    >
                      <b>Event ID:</b> {eventKey}
                    </Text>
                    <Flex gap="2" wrap="wrap" align="center">
                      <CopyPill
                        value={eventKey}
                        label="Copy"
                        toastMsg="Event ID copied"
                        size="2"
                      />
                      <a
                        href={suiscanObjectUrl(eventKey)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    </Flex>
                  </Flex>
                </Surface>
              ) : null}

              <Flex direction="column" gap="2">
                {arr.map((c) => (
                  <Surface key={c.id}>
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

                        <Flex gap="2" wrap="wrap" align="center">
                          <Button
                            size="2"
                            className="st-pillBtn"
                            variant={selectedCapId === c.id ? "solid" : "soft"}
                            onClick={() => useCap(c.id)}
                          >
                            {selectedCapId === c.id ? "Using" : "Use"}
                          </Button>
                          <CopyPill value={c.id} label="Copy" size="2" />
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
                        <Surface dense>
                          <Flex direction="column" gap="2">
                            <Text size="2" color="gray">
                              GateCap details
                            </Text>

                            <Text
                              size="2"
                              style={{ wordBreak: "break-all", opacity: 0.85 }}
                            >
                              <b>Cap ID:</b> {c.id}
                            </Text>
                            <Flex gap="2" wrap="wrap" align="center">
                              <CopyPill
                                value={c.id}
                                label="Copy cap"
                                size="2"
                              />
                              <a
                                href={suiscanObjectUrl(c.id)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open
                              </a>
                            </Flex>

                            <Text
                              size="2"
                              style={{ wordBreak: "break-all", opacity: 0.85 }}
                            >
                              <b>Event ID:</b> {c.eventId ?? "-"}
                            </Text>
                            {c.eventId ? (
                              <Flex gap="2" wrap="wrap" align="center">
                                <CopyPill
                                  value={c.eventId}
                                  label="Copy event"
                                  size="2"
                                />
                                <a
                                  href={suiscanObjectUrl(c.eventId)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open
                                </a>
                              </Flex>
                            ) : null}

                            <Text
                              size="2"
                              style={{ opacity: 0.75, wordBreak: "break-all" }}
                            >
                              <b>Owner:</b> {account.address}
                            </Text>
                            <CopyPill
                              value={account.address}
                              label="Copy owner"
                              size="2"
                            />
                          </Flex>
                        </Surface>
                      ) : null}
                    </Flex>
                  </Surface>
                ))}
              </Flex>
            </Flex>
          ))}
        </Flex>
      )}
    </Flex>
  );
}
