import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Button, Flex, Heading, Text } from "@radix-ui/themes";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  IdCardIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons";
import { toast } from "../lib/toast";
import { setRole, type AppRole } from "../lib/role";

const TAGLINE = "Tickets. Instantly.";

function scrollTo(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Home() {
  const nav = useNavigate();
  const account = useCurrentAccount();
  const [showConnectHint, setShowConnectHint] = useState(false);

  const isConnected = !!account?.address;

  const roleCards = useMemo(
    () =>
      [
        {
          role: "buyer" as const,
          title: "Buy a ticket",
          desc: "Browse events and purchase with a clean, guided flow.",
          icon: <MagnifyingGlassIcon />,
          go: "/explore",
        },
        {
          role: "organizer" as const,
          title: "Create an event",
          desc: "Publish once, then sell tickets. Advanced details stay hidden.",
          icon: <PlusIcon />,
          go: "/create",
        },
        {
          role: "staff" as const,
          title: "Staff check-in",
          desc: "Select event, scan QR, and issue one-time permits.",
          icon: <IdCardIcon />,
          go: "/staff/events",
        },
      ] as const,
    [],
  );

  const howCards = useMemo(
    () =>
      [
        {
          title: "Create",
          desc: "Organizers publish an event and grant staff access for check-in.",
          icon: <PlusIcon />,
        },
        {
          title: "Buy",
          desc: "Attendees purchase tickets and keep them in My Tickets with a clean QR view.",
          icon: <MagnifyingGlassIcon />,
        },
        {
          title: "Check-in",
          desc: "Staff scans QR and issues a one-time permit for controlled, speedy entry.",
          icon: <IdCardIcon />,
        },
      ] as const,
    [],
  );

  function choose(role: AppRole, path: string) {
    if (!isConnected) {
      setShowConnectHint(true);
      toast.info("Connect wallet to continue");
      scrollTo("st-connect");
      return;
    }
    setRole(role);
    nav(path);
  }

  return (
    <div className="st-home">
      {/* HERO */}
      <section className="st-heroFull">
        <div className="st-heroInner">
          <Flex direction="column" gap="4">
            <Flex direction="column" gap="2">
              <Text as="div" className="st-kicker st-fadeUp st-delay1">
                SuiTicket
              </Text>

              <Heading
                as="h1"
                size="9"
                className="st-heroTitle st-fadeUp st-delay2"
              >
                {TAGLINE}
              </Heading>

              <Text
                as="div"
                size="3"
                className="st-heroSub st-fadeUp st-delay3"
                style={{ maxWidth: 920 }}
              >
                Buy, create, and check-in with QR — while keeping chain details
                tucked away until you actually need them.
              </Text>
            </Flex>

            <Flex gap="2" wrap="wrap" align="center">
              <Button
                size="3"
                className="st-press"
                onClick={() => scrollTo("st-roles")}
              >
                Get started
              </Button>

              <Button
                size="3"
                variant="soft"
                color="gray"
                className="st-press"
                onClick={() => choose("buyer", "/explore")}
              >
                Continue as buyer
              </Button>
            </Flex>

            <Flex align="center" gap="2" style={{ marginTop: 2 }}>
              <LightningBoltIcon />
              <Text as="div" size="2" style={{ opacity: 0.68 }}>
                Testnet demo — fast iteration mode.
              </Text>
            </Flex>
          </Flex>
        </div>
      </section>

      {/* ROLES */}
      <section id="st-roles" className="st-sectionFull">
        <div className="st-sectionHead">
          <Heading as="h2" size="6">
            Choose your role
          </Heading>
          <Text as="div" size="2" style={{ opacity: 0.75, maxWidth: 920 }}>
            Your top bar adapts to what you choose. You can switch anytime.
          </Text>
        </div>

        <div className="st-grid3">
          {roleCards.map((c) => (
            <Box
              key={c.role}
              className="st-tile2 st-cardHover st-press"
              role="button"
              tabIndex={0}
              onClick={() => choose(c.role, c.go)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") choose(c.role, c.go);
              }}
            >
              <Flex direction="column" gap="3">
                <Flex align="center" gap="3">
                  <div className="st-iconChip">{c.icon}</div>
                  <Text as="div" size="4" weight="bold">
                    {c.title}
                  </Text>
                </Flex>

                <Text
                  as="div"
                  size="2"
                  style={{ opacity: 0.78, lineHeight: 1.7 }}
                >
                  {c.desc}
                </Text>

                <div className="st-tileHint" aria-hidden="true">
                  →
                </div>
              </Flex>
            </Box>
          ))}
        </div>

        <div id="st-connect" />

        {!isConnected ? (
          <div
            className="st-connectStrip"
            data-attn={showConnectHint ? "1" : "0"}
          >
            <Flex align="center" justify="between" gap="3" wrap="wrap">
              <Flex direction="column" gap="1">
                <Text as="div" weight="bold" size="3">
                  Connect wallet to continue
                </Text>
                <Text
                  as="div"
                  size="2"
                  style={{ opacity: 0.72, lineHeight: 1.6 }}
                >
                  One-time step. After that, the app stays clean and focused.
                </Text>
              </Flex>
              <ConnectButton />
            </Flex>
          </div>
        ) : (
          <Text as="div" size="2" style={{ opacity: 0.65 }}>
            Connected as {account.address.slice(0, 6)}…
            {account.address.slice(-4)}
          </Text>
        )}
      </section>

      {/* HOW IT WORKS (no numbers, clean, modern) */}
      <section className="st-sectionFull">
        <div className="st-sectionHead">
          <Heading as="h2" size="6">
            How it works
          </Heading>
          <Text as="div" size="2" style={{ opacity: 0.75, maxWidth: 920 }}>
            Simple flow. Fast check-in. Details stay hidden unless you ask.
          </Text>
        </div>

        <div className="st-grid3">
          {howCards.map((c) => (
            <div key={c.title} className="st-featureCard">
              <Flex direction="column" gap="3">
                <div className="st-iconChip st-iconChipSoft">{c.icon}</div>

                <Text as="div" size="4" weight="bold">
                  {c.title}
                </Text>

                <Text
                  as="div"
                  size="2"
                  style={{ opacity: 0.78, lineHeight: 1.7 }}
                >
                  {c.desc}
                </Text>
              </Flex>
            </div>
          ))}
        </div>

        <Text as="div" size="2" style={{ opacity: 0.6, marginTop: 14 }}>
          Tip: IDs and object links live under Details — visible when needed,
          hidden when not.
        </Text>
      </section>
    </div>
  );
}
