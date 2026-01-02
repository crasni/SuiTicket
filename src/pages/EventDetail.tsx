import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Card, Dialog, Flex, Text, TextField } from "@radix-ui/themes";
import PageHeader from "../components/PageHeader";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useEvent } from "../hooks/useEvent";
import { useTicketActions } from "../hooks/useTicketActions";
import { toast } from "../lib/toast";
import { copyText } from "../lib/clipboard";

export default function EventDetail() {
  const { eventId } = useParams();
  const account = useCurrentAccount();
  const { data: ev, isLoading, error } = useEvent(eventId);
  const actions = useTicketActions();

  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  const recipientAddr = useMemo(() => {
    const r = recipient.trim();
    return r || account?.address || "";
  }, [recipient, account?.address]);

  async function onBuy() {
    if (!ev) return;
    if (!account?.address) return;
    if (!ev.sharedVersion) {
      toast.error("Can't buy", "Event is not shared (missing shared version).");
      return;
    }
    try {
      setIsBuying(true);
      const res: any = await actions.buyTicket({
        eventId: ev.id,
        eventSharedVersion: ev.sharedVersion,
        priceMist: ev.priceMist,
        recipient: recipientAddr,
      });

      const digest = res?.digest as string | undefined;
      const ok = res?.effects?.status?.status === "success";
      if (!ok) {
        const err = res?.effects?.status?.error;
        toast.error("Purchase failed", err ?? "Transaction failed");
        return;
      }

      toast.success(
        "Purchase successful",
        digest ? `Tx: ${digest}` : undefined,
      );
      setOpen(false);
      setRecipient("");
    } catch (e: any) {
      toast.error("Purchase failed", e?.message ?? String(e));
    } finally {
      setIsBuying(false);
    }
  }

  return (
    <Flex direction="column" gap="4">
      <PageHeader
        title={ev?.name ? ev.name : "Event"}
        subtitle="Review details and buy your ticket."
        right={
          <Button
            disabled={!ev || !account?.address}
            onClick={() => setOpen(true)}
          >
            Buy Ticket
          </Button>
        }
      />

      {isLoading ? (
        <Card>
          <Text size="2" style={{ opacity: 0.7 }}>
            Loading event…
          </Text>
        </Card>
      ) : error ? (
        <Card>
          <Text color="red">Failed to load event.</Text>
        </Card>
      ) : ev ? (
        <Card>
          <Flex direction="column" gap="2">
            <Text weight="medium">{ev.name}</Text>
            <Text size="2" style={{ opacity: 0.7 }}>
              Price: {ev.priceSui} SUI
            </Text>
            <Text size="2" style={{ opacity: 0.7, wordBreak: "break-all" }}>
              Organizer: {ev.organizer}
            </Text>

            <Flex align="center" justify="between" style={{ marginTop: 8 }}>
              <Text size="2" style={{ opacity: 0.7 }}>
                Details
              </Text>
              <Button
                size="2"
                variant="soft"
                color="gray"
                onClick={() => setShowDetails((x) => !x)}
              >
                {showDetails ? "Hide" : "Show"}
              </Button>
            </Flex>

            {showDetails ? (
              <Card>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">
                    Event
                  </Text>
                  <Text
                    size="2"
                    style={{ opacity: 0.85, wordBreak: "break-all" }}
                  >
                    <Text weight="medium">Event ID:</Text> {ev.id}
                    <Button
                      size="1"
                      variant="soft"
                      color="gray"
                      style={{ marginLeft: 8 }}
                      onClick={() => copyText(ev.id, "Event ID copied")}
                    >
                      Copy
                    </Button>
                  </Text>
                </Flex>
              </Card>
            ) : null}
          </Flex>
        </Card>
      ) : null}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Content style={{ maxWidth: 520 }}>
          <Dialog.Title>Buy Ticket</Dialog.Title>
          <Dialog.Description size="2" style={{ opacity: 0.7 }}>
            Confirm the recipient and purchase in your wallet.
          </Dialog.Description>

          <Flex direction="column" gap="3" mt="4">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Recipient (optional)
              </Text>
              <TextField.Root
                placeholder="Leave empty = my wallet"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </Flex>

            <Card>
              <Flex direction="column" gap="1">
                <Text size="2" style={{ opacity: 0.7 }}>
                  Summary
                </Text>
                <Text size="2">Price: {ev?.priceSui ?? "-"} SUI</Text>
                <Text size="2" style={{ wordBreak: "break-all", opacity: 0.8 }}>
                  Recipient: {recipientAddr || "(connect wallet)"}
                </Text>
              </Flex>
            </Card>

            <Flex gap="2" justify="end">
              <Button
                variant="ghost"
                color="gray"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!ev || !account?.address || isBuying}
                onClick={onBuy}
              >
                Confirm Purchase
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}
