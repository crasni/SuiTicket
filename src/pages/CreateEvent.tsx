import { useState } from "react";
import { Button, Card, Flex, Text, TextField } from "@radix-ui/themes";
import PageHeader from "../components/PageHeader";
import { useTicketActions } from "../hooks/useTicketActions";

const PLATFORM_DUMMY = "0x0000000000000000000000000000000000000000";

export default function CreateEvent() {
  const actions = useTicketActions();

  const [name, setName] = useState("My Event");
  const [priceSui, setPriceSui] = useState("0.1");
  const [feeBps, setFeeBps] = useState(300);
  const [platform, setPlatform] = useState(PLATFORM_DUMMY);

  const [status, setStatus] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function onCreate() {
    if (isCreating) return;
    setIsCreating(true);
    setStatus("Creating event…");
    try {
      const res = await actions.createEvent({
        name,
        priceSui,
        feeBps,
        platform,
      });
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

      <Card>
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

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">
              Fee bps (advanced)
            </Text>
            <TextField.Root
              value={String(feeBps)}
              onChange={(e) => setFeeBps(Number(e.target.value || "0"))}
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">
              Platform (advanced)
            </Text>
            <TextField.Root
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            />
          </Flex>

          <Flex gap="2" justify="end" wrap="wrap">
            <Button size="2" onClick={onCreate} disabled={isCreating}>
              {isCreating ? "Creating…" : "Create"}
            </Button>
          </Flex>

          {status ? (
            <Text size="2" style={{ opacity: 0.7, wordBreak: "break-all" }}>
              {status}
            </Text>
          ) : null}
        </Flex>
      </Card>
    </Flex>
  );
}
