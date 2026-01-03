import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Button, Flex, Text } from "@radix-ui/themes";
import PageHeader from "../components/PageHeader";
import Surface from "../components/Surface";
import EmptyState from "../components/EmptyState";
import { clearRole, getRole, roleEventName, type AppRole } from "../lib/role";
import { useOwned } from "../hooks/useOwned";

function shortAddr(a?: string) {
  if (!a) return "-";
  if (a.length <= 14) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function roleLabel(role: AppRole) {
  return role === "buyer"
    ? "Buyer"
    : role === "organizer"
      ? "Organizer"
      : "Staff";
}

// --- helpers: extract Sui object IDs from various shapes ---
function toId(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;

  // common Sui shapes: { bytes: "0x..." } or nested { id: { bytes } } etc.
  if (typeof v === "object") {
    if ("bytes" in v && typeof (v as any).bytes === "string")
      return (v as any).bytes;
    if ("id" in v) return toId((v as any).id);
  }
  return null;
}

function extractEventIdFromCap(cap: any): string | null {
  // try a few likely layouts
  return (
    toId(cap?.fields?.event_id) ||
    toId(cap?.fields?.eventId) ||
    toId(cap?.event_id) ||
    toId(cap?.eventId) ||
    null
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const account = useCurrentAccount();
  const owned = useOwned();

  const [role, setRoleState] = useState<AppRole | null>(() => getRole());

  // keep role state synced (role is stored in localStorage)
  useEffect(() => {
    const evt = roleEventName();
    function sync() {
      setRoleState(getRole());
    }
    window.addEventListener(evt, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(evt, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // If wallet is connected but no role exists, dashboard should NOT ask user to choose again.
  // Send them back to Home (the only place where role is chosen).
  useEffect(() => {
    if (account?.address && !role) {
      nav("/", { replace: true });
    }
  }, [account?.address, role, nav]);

  // Derive organizer "events" from GateCaps -> event_id (because Event is shared and not owned)
  const { stats, myEventIds } = useMemo(() => {
    const caps = owned.data?.caps ?? [];
    const tickets = owned.data?.tickets ?? [];

    const set = new Set<string>();
    for (const c of caps) {
      const eid = extractEventIdFromCap(c);
      if (eid) set.add(eid);
    }

    const ids = Array.from(set);

    return {
      stats: {
        // IMPORTANT: events count must be from caps->event_id, not owned.data.events
        events: ids.length,
        tickets: tickets.length,
        caps: caps.length,
      },
      myEventIds: ids,
    };
  }, [owned.data]);

  const panel = useMemo(() => {
    if (!role) return null;

    if (role === "buyer") {
      return {
        title: "Buyer",
        desc: "Browse events and buy tickets.",
        primary: { label: "Explore", to: "/explore" },
        secondary: { label: "My Tickets", to: "/tickets" },
        meta: [{ k: "Tickets", v: String(stats.tickets) }],
        recentTitle: "Recent tickets",
        recent: (owned.data?.tickets ?? []).slice(0, 3).map((t) => t.id),
        recentTo: "/tickets",
      };
    }

    if (role === "organizer") {
      return {
        title: "Organizer",
        desc: "Create events and manage access.",
        primary: { label: "Create Event", to: "/create" },
        secondary: { label: "Explore (preview)", to: "/explore" },
        // show BOTH events and caps since caps are what you actually own
        meta: [
          { k: "Events", v: String(stats.events) },
          { k: "Caps", v: String(stats.caps) },
        ],
        recentTitle: "Your events (from GateCaps)",
        // show ALL event ids (not just 3) so you can see your “3 events” immediately
        recent: myEventIds,
        // no dedicated “my events” page yet; we’ll just keep this button consistent
        recentTo: "/explore",
      };
    }

    return {
      title: "Staff",
      desc: "Check in attendees and issue one-time permits.",
      primary: { label: "Start Check-in", to: "/staff" },
      secondary: { label: "Events", to: "/staff/events" },
      meta: [{ k: "Caps", v: String(stats.caps) }],
      recentTitle: "GateCaps",
      recent: (owned.data?.caps ?? []).slice(0, 3).map((c) => c.id),
      recentTo: "/staff",
    };
  }, [role, stats, owned.data, myEventIds]);

  return (
    <Flex direction="column" gap="4">
      <PageHeader
        title="Dashboard"
        subtitle={
          role
            ? `Mode: ${roleLabel(role)} • Wallet: ${shortAddr(account?.address)}`
            : `Wallet: ${shortAddr(account?.address)}`
        }
        right={
          role ? (
            <Button
              size="2"
              variant="soft"
              color="gray"
              onClick={() => {
                clearRole();
                setRoleState(null);
                nav("/");
              }}
            >
              Switch role
            </Button>
          ) : null
        }
      />

      {!account?.address ? (
        <EmptyState
          title="Connect your wallet to continue"
          desc="Dashboard requires a connected wallet."
        />
      ) : !role || !panel ? (
        <EmptyState
          title="No role selected"
          desc="Go back to Home to pick a role."
          action={<Button onClick={() => nav("/")}>Back Home</Button>}
        />
      ) : (
        <Surface className="st-panelActive">
          <Flex direction="column" gap="3">
            <Flex direction="column" gap="1">
              <Text size="4" weight="bold">
                {panel.title}
              </Text>
              <Text size="2" style={{ opacity: 0.75, lineHeight: 1.6 }}>
                {panel.desc}
              </Text>
            </Flex>

            <Flex gap="2" wrap="wrap" align="center">
              {panel.meta.map((m) => (
                <Box key={m.k} className="st-metaPill">
                  <Text size="2" style={{ opacity: 0.8 }}>
                    {m.k}: <b>{m.v}</b>
                  </Text>
                </Box>
              ))}
            </Flex>

            <Flex gap="2" wrap="wrap" align="center" justify="end">
              <Button
                size="2"
                className="st-pillBtn"
                onClick={() => nav(panel.primary.to)}
              >
                {panel.primary.label}
              </Button>
              <Button
                size="2"
                variant="soft"
                color="gray"
                onClick={() => nav(panel.secondary.to)}
              >
                {panel.secondary.label}
              </Button>
            </Flex>

            <div
              style={{ height: 1, background: "var(--gray-a4)", marginTop: 4 }}
            />

            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">
                {panel.recentTitle}
              </Text>

              {panel.recent.length ? (
                <Flex direction="column" gap="2">
                  {panel.recent.map((id) => (
                    <Flex key={id} align="center" justify="between" gap="3">
                      <Text size="2" style={{ opacity: 0.75 }}>
                        {id.slice(0, 10)}…{id.slice(-6)}
                      </Text>

                      {role === "organizer" ? (
                        <Flex gap="2" align="center">
                          <Button
                            size="1"
                            variant="solid"
                            color="indigo"
                            highContrast
                            onClick={() => nav(`/event/${id}`)}
                          >
                            Event detail
                          </Button>
                        </Flex>
                      ) : null}
                    </Flex>
                  ))}

                  {/* Keep View all for buyer/staff; organizer already shows all */}
                  {role !== "organizer" ? (
                    <Button
                      size="2"
                      variant="soft"
                      color="gray"
                      style={{ alignSelf: "flex-start" }}
                      onClick={() => nav(panel.recentTo)}
                    >
                      View all
                    </Button>
                  ) : null}
                </Flex>
              ) : (
                <Text size="2" style={{ opacity: 0.7 }}>
                  Nothing yet.
                </Text>
              )}
            </Flex>
          </Flex>
        </Surface>
      )}
    </Flex>
  );
}
