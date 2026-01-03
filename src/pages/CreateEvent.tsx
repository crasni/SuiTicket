import { useState } from "react";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";
import PageHeader from "../components/PageHeader";
import Surface from "../components/Surface";
import AdvancedDetails from "../components/AdvancedDetails";
import CopyPill from "../components/CopyPill";
import { useTicketActions } from "../hooks/useTicketActions";

const PLATFORM_DUMMY =
  "0xe7db9021ff53de89cd3c527fb2911be32eb22c3ec2a8b77e1ccb47ab1b0afc40";

export default function CreateEvent() {
  const actions = useTicketActions();

  const [name, setName] = useState("My Event");
  const [priceSui, setPriceSui] = useState("0.1");
  const [feeBps, setFeeBps] = useState(300);
  const [platform, setPlatform] = useState(PLATFORM_DUMMY);

  const [status, setStatus] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string>("");

  function extractCreatedEventId(res: any): string {
    const changes = (res?.objectChanges ?? []) as any[];
    const hit = changes.find(
      (c) =>
        c?.type === "created" &&
        typeof c?.objectType === "string" &&
        c.objectType.endsWith("::Event"),
    );
    return String(hit?.objectId ?? "");
  }

  async function onCreate() {
    if (isCreating) return;
    setIsCreating(true);
    setStatus("Creating event…");
    setCreatedEventId("");
    try {
      const res = await actions.createEvent({
        name,
        priceSui,
        feeBps,
        platform,
      });
      const evId = extractCreatedEventId(res);
      if (evId) setCreatedEventId(evId);
      setStatus(`✅ Created. digest=${res.digest}`);
    } catch (e: any) {
      setStatus(`❌ Create failed: ${e?.message ?? String(e)}`);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Flex direction="column" gap="4">
      <PageHeader
        title="Create Event"
        subtitle="Create a new event and start selling tickets."
      />

      <Surface>
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">
              Event name
            </Text>
            <TextField.Root
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">
              Price (SUI)
            </Text>
            <TextField.Root
              value={priceSui}
              onChange={(e) => setPriceSui(e.target.value)}
            />
          </Flex>

          <AdvancedDetails
            open={showAdvanced}
            onOpenChange={setShowAdvanced}
            label="Advanced settings"
          >
            <Flex direction="column" gap="3">
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  Fee (bps)
                </Text>
                <TextField.Root
                  value={String(feeBps)}
                  onChange={(e) => setFeeBps(Number(e.target.value || "0"))}
                />
                <Text size="2" className="st-muted" style={{ lineHeight: 1.6 }}>
                  Basis points: 100 bps = 1%. Example: 300 bps = 3%.
                </Text>
              </Flex>

              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  Platform address
                </Text>
                <TextField.Root
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                />
                <Text size="2" className="st-muted" style={{ lineHeight: 1.6 }}>
                  Where platform fees are sent. Keep default for now.
                </Text>
              </Flex>
            </Flex>
          </AdvancedDetails>

          <Flex gap="2" justify="end" wrap="wrap">
            <Button
              size="2"
              className="st-pillBtn"
              onClick={onCreate}
              disabled={isCreating}
            >
              {isCreating ? "Creating…" : "Create"}
            </Button>
          </Flex>

          {status ? (
            <Text size="2" style={{ opacity: 0.7, wordBreak: "break-all" }}>
              {status}
            </Text>
          ) : null}

          {createdEventId ? (
            <Surface dense>
              <Flex direction="column" gap="2">
                <Text weight="medium">Event created</Text>
                <Text size="2" style={{ opacity: 0.8, wordBreak: "break-all" }}>
                  Event ID: {createdEventId}
                </Text>
                <Flex gap="2" wrap="wrap">
                  <CopyPill
                    value={createdEventId}
                    label="Copy Event ID"
                    toastMsg="Event ID copied"
                    size="2"
                  />
                </Flex>
              </Flex>
            </Surface>
          ) : null}
        </Flex>
      </Surface>
    </Flex>
  );
}
