import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Flex, Text, TextField } from "@radix-ui/themes";
import PageHeader from "../components/PageHeader";
import BackButton from "../components/BackButton";
import EmptyState from "../components/EmptyState";
import Surface from "../components/Surface";
import AdvancedDetails from "../components/AdvancedDetails";
import CopyPill from "../components/CopyPill";
import { useEventNames } from "../hooks/useEventNames";
import {
  loadRecentEvents,
  pushRecentEvent,
  removeRecentEvent,
} from "../lib/storage";
import { EVENT_REGISTRY_ID } from "../config/contracts";
import { useQuery } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";

function toId(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if ("bytes" in v && typeof v.bytes === "string") return v.bytes;
    if ("id" in v) return toId(v.id);
  }
  return null;
}

function extractIdVectorMaybe(fields: any, key: string): string[] {
  const raw = fields?.[key];
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    const id = toId(x);
    if (id) out.push(id);
  }
  return out;
}

export default function Explore() {
  const [eventId, setEventId] = useState("");
  const [search, setSearch] = useState("");
  const [nonce, setNonce] = useState(0);
  const [openActions, setOpenActions] = useState<Record<string, boolean>>({});
  const nav = useNavigate();
  const client = useSuiClient();

  const recents = useMemo(() => {
    void nonce;
    return loadRecentEvents();
  }, [nonce]);

  const registry = useQuery({
    queryKey: ["event-registry", EVENT_REGISTRY_ID],
    enabled: !!EVENT_REGISTRY_ID,
    queryFn: async () => {
      const obj = await client.getObject({
        id: EVENT_REGISTRY_ID!,
        options: { showContent: true, showType: true },
      });

      const content: any = (obj as any)?.data?.content;
      const fields: any = content?.fields;

      const ids = extractIdVectorMaybe(fields, "events");

      const seen = new Set<string>();
      const uniq: string[] = [];
      for (const id of ids) {
        if (!seen.has(id)) {
          seen.add(id);
          uniq.push(id);
        }
      }
      return uniq;
    },
  });

  const registryIds = registry.data ?? [];

  const idsForNames = useMemo(() => {
    const set = new Set<string>();
    for (const id of registryIds) set.add(id);
    for (const id of recents) set.add(id);
    return Array.from(set);
  }, [registryIds, recents]);

  const nameMap = useEventNames(idsForNames);

  function shortId(id?: string) {
    if (!id) return "-";
    const s = id.trim();
    if (s.length <= 14) return s;
    return `${s.slice(0, 6)}…${s.slice(-4)}`;
  }

  function go(id: string) {
    const clean = id.trim();
    if (!clean) return;
    pushRecentEvent(clean);
    setNonce((x) => x + 1);
    nav(`/event/${clean}`);
  }

  const filteredRegistry = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registryIds;

    return registryIds.filter((id) => {
      const name = nameMap[id] ?? "";
      return (
        name.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q) ||
        shortId(id).toLowerCase().includes(q)
      );
    });
  }, [search, registryIds, nameMap]);

  return (
    <Flex direction="column" gap="4">
      <div className="st-backCorner">
        <BackButton fallbackTo="/dashboard" label="Back" />
      </div>

      <PageHeader
        title="Explore"
        subtitle={
          EVENT_REGISTRY_ID
            ? "Browse all events, search by name, or open by Event ID."
            : "Paste an Event ID to view details. (Registry not configured yet.)"
        }
      />

      {/* Open by ID */}
      <Surface>
        <Flex direction="column" gap="3">
          <Text weight="medium">Open by Event ID</Text>
          <Flex gap="2" wrap="wrap" align="center">
            <TextField.Root
              placeholder="0x... event object id"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              style={{ flex: 1, minWidth: 320 }}
            />
            <Button size="2" className="st-pillBtn" onClick={() => go(eventId)}>
              Load
            </Button>
          </Flex>
          <Text size="2" className="st-muted" style={{ lineHeight: 1.7 }}>
            Tip: we’ll remember events you opened recently.
          </Text>
        </Flex>
      </Surface>

      {/* All events + search */}
      <Surface>
        <Flex direction="column" gap="3">
          <Flex align="center" justify="between" gap="2" wrap="wrap">
            <Text weight="medium">All events</Text>
            <Text size="2" style={{ opacity: 0.7 }}>
              {EVENT_REGISTRY_ID
                ? registry.isLoading
                  ? "Loading…"
                  : `${registryIds.length} total`
                : "Registry not set"}
            </Text>
          </Flex>

          {EVENT_REGISTRY_ID ? (
            <>
              <TextField.Root
                placeholder="Search by name (e.g., concert, NTU, demo...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {registry.isLoading ? (
                <Text size="2" style={{ opacity: 0.7 }}>
                  Loading registry…
                </Text>
              ) : registry.isError ? (
                <Text size="2" style={{ opacity: 0.7 }}>
                  Failed to load registry. Check VITE_TICKET_REGISTRY_ID.
                </Text>
              ) : filteredRegistry.length === 0 ? (
                <EmptyState
                  title="No matches"
                  desc="Try a different keyword."
                />
              ) : (
                <Flex direction="column" gap="2">
                  {filteredRegistry.map((id) => (
                    <Card
                      key={id}
                      style={{
                        borderRadius: 18,
                        padding: 14,
                        border: "1px solid rgba(59, 130, 246, 0.35)",
                        background:
                          "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(14,165,233,0.06), rgba(255,255,255,0.02))",
                        boxShadow:
                          "0 16px 44px rgba(0,0,0,0.40), 0 0 0 1px rgba(59,130,246,0.08) inset",
                      }}
                    >
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
                          <Text weight="medium">
                            {nameMap[id] ?? `Event ${shortId(id)}`}
                          </Text>
                          <Text
                            size="2"
                            style={{ wordBreak: "break-all", opacity: 0.75 }}
                          >
                            {shortId(id)}
                          </Text>
                        </Flex>

                        <Flex gap="2" wrap="wrap" align="center">
                          <Button
                            size="2"
                            className="st-pillBtn"
                            onClick={() => go(id)}
                          >
                            View
                          </Button>
                          <CopyPill
                            value={id}
                            label="Copy ID"
                            toastMsg="Event ID copied"
                            size="2"
                          />
                        </Flex>
                      </Flex>
                    </Card>
                  ))}
                </Flex>
              )}
            </>
          ) : (
            <Text size="2" style={{ opacity: 0.7, lineHeight: 1.7 }}>
              To enable listing + keyword search, set{" "}
              <b>VITE_TICKET_REGISTRY_ID</b> in <b>.env.local</b> after calling{" "}
              <b>init_registry</b> once on-chain.
            </Text>
          )}
        </Flex>
      </Surface>

      {/* Recent */}
      <Flex direction="column" gap="2">
        <Text weight="medium">Recent</Text>

        {recents.length === 0 ? (
          <EmptyState
            title="No recent events"
            desc="Once you open an event, it will show up here."
          />
        ) : (
          <Flex direction="column" gap="2">
            {recents.map((id) => (
              <Surface key={id}>
                <Flex direction="column" gap="3">
                  <Flex align="center" justify="between" gap="3" wrap="wrap">
                    <Flex direction="column" gap="1" style={{ minWidth: 260 }}>
                      <Text weight="medium">
                        {nameMap[id] ?? `Event ${shortId(id)}`}
                      </Text>
                      <Text
                        size="2"
                        style={{ wordBreak: "break-all", opacity: 0.7 }}
                      >
                        {shortId(id)}
                      </Text>
                    </Flex>
                    <Flex gap="2" wrap="wrap" align="center">
                      <Button
                        size="2"
                        className="st-pillBtn"
                        onClick={() => go(id)}
                      >
                        View
                      </Button>
                    </Flex>
                  </Flex>

                  <AdvancedDetails
                    open={!!openActions[id]}
                    onOpenChange={(next) =>
                      setOpenActions((m) => ({ ...m, [id]: next }))
                    }
                    label="Quick actions"
                  >
                    <Flex gap="2" wrap="wrap" align="center">
                      <CopyPill
                        value={id}
                        label="Copy ID"
                        toastMsg="Event ID copied"
                        size="2"
                      />
                      <Button
                        size="2"
                        variant="soft"
                        color="gray"
                        className="st-pillBtn"
                        onClick={() => {
                          removeRecentEvent(id);
                          setNonce((x) => x + 1);
                        }}
                      >
                        Remove
                      </Button>
                    </Flex>
                  </AdvancedDetails>
                </Flex>
              </Surface>
            ))}
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}
