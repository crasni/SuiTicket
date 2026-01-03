import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Dialog, Flex, Text, TextField } from "@radix-ui/themes";
import PageHeader from "../components/PageHeader";
import Surface from "../components/Surface";
import AdvancedDetails from "../components/AdvancedDetails";
import CopyPill from "../components/CopyPill";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useEvent } from "../hooks/useEvent";
import { useTicketActions } from "../hooks/useTicketActions";
import { toast } from "../lib/toast";

const MIST_PER_SUI = 1_000_000_000n;

function shortAddr(a?: string) {
  if (!a) return "-";
  const s = a.trim();
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function formatSuiFromMist(mist: bigint) {
  const whole = mist / MIST_PER_SUI;
  const frac = mist % MIST_PER_SUI;
  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}

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

  // --- New: compute fee + payout from on-chain fields (price_mist + fee_bps)
  const breakdown = useMemo(() => {
    if (!ev) return null;

    const priceMist = BigInt(String(ev.priceMist ?? 0));
    const feeBps = Number((ev as any).feeBps ?? 0);

    const feeMist = (priceMist * BigInt(feeBps)) / 10_000n;
    const payoutMist = priceMist - feeMist;

    return {
      feeBps,
      feeSui: formatSuiFromMist(feeMist),
      payoutSui: formatSuiFromMist(payoutMist),
    };
  }, [ev]);

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

  const platformAddr = (ev as any)?.platform as string | undefined;

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
        <Surface>
          <Text size="2" style={{ opacity: 0.7 }}>
            Loading event…
          </Text>
        </Surface>
      ) : error ? (
        <Surface>
          <Text color="red">Failed to load event.</Text>
        </Surface>
      ) : ev ? (
        <Surface>
          <Flex direction="column" gap="3">
            {/* Main summary (clean, non-blockchainy) */}
            <Flex direction="column" gap="1">
              <Text weight="bold" size="4">
                {ev.name}
              </Text>

              <Flex gap="3" wrap="wrap" align="center">
                <Text size="2" style={{ opacity: 0.78 }}>
                  Price: <b>{ev.priceSui}</b> SUI
                </Text>

                {breakdown ? (
                  <Text size="2" style={{ opacity: 0.78 }}>
                    Platform fee: <b>{(breakdown.feeBps / 100).toFixed(2)}%</b>
                  </Text>
                ) : null}
              </Flex>
            </Flex>

            {/* New: payment breakdown */}
            <Surface dense>
              <Flex direction="column" gap="1">
                <Text size="2" style={{ opacity: 0.7 }}>
                  Payment breakdown
                </Text>

                <Flex justify="between" gap="2">
                  <Text size="2" style={{ opacity: 0.85 }}>
                    You pay
                  </Text>
                  <Text size="2">
                    <b>{ev.priceSui}</b> SUI
                  </Text>
                </Flex>

                {breakdown ? (
                  <>
                    <Flex justify="between" gap="2">
                      <Text size="2" style={{ opacity: 0.85 }}>
                        Fee → platform
                      </Text>
                      <Text size="2">{breakdown.feeSui} SUI</Text>
                    </Flex>

                    <Flex justify="between" gap="2">
                      <Text size="2" style={{ opacity: 0.85 }}>
                        Payout → organizer
                      </Text>
                      <Text size="2">{breakdown.payoutSui} SUI</Text>
                    </Flex>
                  </>
                ) : (
                  <Text size="2" style={{ opacity: 0.7 }}>
                    (fee info unavailable)
                  </Text>
                )}
              </Flex>
            </Surface>

            <div className="st-divider" />

            {/* Advanced details: IDs + addresses */}
            <AdvancedDetails
              open={showDetails}
              onOpenChange={setShowDetails}
              label="Advanced details"
            >
              <Flex direction="column" gap="2">
                <Text size="2" style={{ opacity: 0.75 }}>
                  Addresses
                </Text>

                <Flex align="center" justify="between" gap="2" wrap="wrap">
                  <Text size="2" style={{ opacity: 0.85 }}>
                    Organizer: {shortAddr(ev.organizer)}
                  </Text>
                  <CopyPill
                    value={ev.organizer}
                    label="Copy"
                    toastMsg="Organizer copied"
                    size="1"
                  />
                </Flex>

                {platformAddr ? (
                  <Flex align="center" justify="between" gap="2" wrap="wrap">
                    <Text size="2" style={{ opacity: 0.85 }}>
                      Platform: {shortAddr(platformAddr)}
                    </Text>
                    <CopyPill
                      value={platformAddr}
                      label="Copy"
                      toastMsg="Platform copied"
                      size="1"
                    />
                  </Flex>
                ) : null}

                <div className="st-divider" />

                <Text
                  size="2"
                  style={{ opacity: 0.85, wordBreak: "break-all" }}
                >
                  <b>Event ID</b>: {ev.id}
                </Text>

                <Flex gap="2" wrap="wrap" align="center">
                  <CopyPill
                    value={ev.id}
                    label="Copy Event ID"
                    toastMsg="Event ID copied"
                    size="2"
                  />
                  {ev.sharedVersion ? (
                    <CopyPill
                      value={ev.sharedVersion}
                      label="Copy shared version"
                      toastMsg="Shared version copied"
                      size="2"
                    />
                  ) : null}
                </Flex>
              </Flex>
            </AdvancedDetails>
          </Flex>
        </Surface>
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

            <Surface dense>
              <Flex direction="column" gap="1">
                <Text size="2" style={{ opacity: 0.7 }}>
                  Summary
                </Text>
                <Text size="2">Price: {ev?.priceSui ?? "-"} SUI</Text>

                {breakdown ? (
                  <>
                    <Text size="2" style={{ opacity: 0.85 }}>
                      Fee: {breakdown.feeSui} SUI (
                      {(breakdown.feeBps / 100).toFixed(2)}%)
                    </Text>
                    <Text size="2" style={{ opacity: 0.85 }}>
                      Organizer receives: {breakdown.payoutSui} SUI
                    </Text>
                  </>
                ) : null}

                <Text size="2" style={{ wordBreak: "break-all", opacity: 0.8 }}>
                  Recipient: {recipientAddr || "(connect wallet)"}
                </Text>
              </Flex>
            </Surface>

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
                {isBuying ? "Purchasing…" : "Confirm Purchase"}
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}
