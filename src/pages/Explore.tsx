import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Flex, Text, TextField } from "@radix-ui/themes";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { useEventNames } from "../hooks/useEventNames";
import { copyText } from "../lib/clipboard";
import {
  loadRecentEvents,
  pushRecentEvent,
  removeRecentEvent,
} from "../lib/storage";

export default function Explore() {
  const [eventId, setEventId] = useState("");
  const [nonce, setNonce] = useState(0);
  const nav = useNavigate();

  const recents = useMemo(() => {
    // nonce forces recompute after storage updates
    void nonce;
    return loadRecentEvents();
  }, [nonce]);

  const nameMap = useEventNames(recents);

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

  return (
    <Flex direction="column" gap="4">
      <PageHeader
        title="Explore"
        subtitle="Paste an Event ID to view details and buy a ticket."
      />

      <Card>
        <Flex direction="column" gap="3">
          <Text weight="medium">Open an event</Text>
          <Flex gap="2" wrap="wrap">
            <TextField.Root
              placeholder="0x... event object id"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              style={{ flex: 1, minWidth: 320 }}
            />
            <Button size="2" onClick={() => go(eventId)}>
              Load
            </Button>
          </Flex>
        </Flex>
      </Card>

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
              <Card key={id}>
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
                  <Flex gap="2">
                    <Button size="2" variant="soft" onClick={() => go(id)}>
                      View
                    </Button>
                    <Button
                      size="2"
                      variant="soft"
                      color="gray"
                      onClick={() => copyText(id, "Event ID copied")}
                    >
                      Copy ID
                    </Button>
                    <Button
                      size="2"
                      variant="soft"
                      color="gray"
                      onClick={() => {
                        removeRecentEvent(id);
                        setNonce((x) => x + 1);
                      }}
                    >
                      Remove
                    </Button>
                  </Flex>
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}
