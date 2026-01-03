import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Button, Flex, Heading, Text } from "@radix-ui/themes";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  IdCardIcon,
} from "@radix-ui/react-icons";
import { toast } from "../lib/toast";
import { setRole, type AppRole } from "../lib/role";
import { isEnokiWallet, isGoogleWallet } from "@mysten/enoki";
import CopyPill from "../components/CopyPill";

const TAGLINE = "Tickets. Instantly.";
const SUB = "Buy, create, and check-in with QR — without the blockchain noise.";

function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setInView(true);
        }
      },
      { threshold: 0.15, rootMargin: "-10% 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={["st-reveal", inView ? "is-in" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const nav = useNavigate();
  const account = useCurrentAccount();
  const isConnected = !!account?.address;

  const [showConnectHint, setShowConnectHint] = useState(false);
  const rolesAnchorRef = useRef<HTMLDivElement | null>(null);
  const howAnchorRef = useRef<HTMLDivElement | null>(null);

  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);

  // ✅ After connect, continue to dashboard using the role user clicked.
  useEffect(() => {
    if (!isConnected || !pendingRole) return;
    setRole(pendingRole);
    nav("/dashboard");
    setPendingRole(null);
  }, [isConnected, pendingRole, nav]);

  const roleCards = useMemo(
    () =>
      [
        {
          role: "buyer" as const,
          title: "Buyer",
          headline: "Buy a ticket",
          desc: "Browse events and purchase in a clean, guided flow.",
          icon: <MagnifyingGlassIcon />,
        },
        {
          role: "organizer" as const,
          title: "Organizer",
          headline: "Create an event",
          desc: "Publish once, then sell tickets. Advanced details stay hidden.",
          icon: <PlusIcon />,
        },
        {
          role: "staff" as const,
          title: "Staff",
          headline: "Staff check-in",
          desc: "Pick event, scan QR, and issue one-time permits.",
          icon: <IdCardIcon />,
        },
      ] as const,
    [],
  );

  const howCards = useMemo(
    () =>
      [
        {
          title: "Create",
          desc: "Publish an event and grant staff access.",
          icon: <PlusIcon />,
        },
        {
          title: "Buy",
          desc: "Purchase tickets and keep them in My Tickets.",
          icon: <MagnifyingGlassIcon />,
        },
        {
          title: "Check-in",
          desc: "Scan QR and issue a one-time permit.",
          icon: <IdCardIcon />,
        },
      ] as const,
    [],
  );

  function scrollTo(el: HTMLElement | null) {
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function choose(role: AppRole) {
    if (!isConnected) {
      setPendingRole(role); // ✅ THIS is the key line
      setShowConnectHint(true);

      toast.info("Connect wallet / Login to continue");

      scrollTo(rolesAnchorRef.current);
      return;
    }

    setRole(role);
    nav("/dashboard");
  }

  return (
    <Flex direction="column" gap="6" className="st-homePage">
      {/* HERO */}
      <Reveal>
        <div className="st-heroPanel">
          <Flex direction="column" gap="4">
            <Text as="div" className="st-kicker">
              SuiTicket
            </Text>

            <Heading as="h1" size="9" className="st-heroTitle">
              {TAGLINE}
            </Heading>

            <Text
              as="div"
              size="4"
              className="st-heroSub"
              style={{ maxWidth: 860 }}
            >
              {SUB}
            </Text>

            <Flex gap="2" wrap="wrap" align="center">
              <Button
                size="3"
                className="st-press"
                onClick={() => scrollTo(rolesAnchorRef.current)}
              >
                Get started
              </Button>
              <Button
                size="3"
                variant="soft"
                color="gray"
                onClick={() => scrollTo(howAnchorRef.current)}
              >
                How it works
              </Button>
            </Flex>
          </Flex>
        </div>
      </Reveal>

      {/* ROLES */}
      <div ref={rolesAnchorRef} className="st-homeSectionAnchor" />
      <Reveal>
        <Flex direction="column" gap="4">
          <Heading as="h2" size="6">
            Choose a role
          </Heading>

          <div className="st-grid3">
            {roleCards.map((c) => (
              <Box
                key={c.role}
                className="st-tile2 st-cardHover st-press"
                role="button"
                tabIndex={0}
                onClick={() => choose(c.role)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") choose(c.role);
                }}
              >
                <Flex direction="column" gap="3">
                  <Flex align="center" gap="3">
                    <div className="st-iconChip">{c.icon}</div>
                    <Flex direction="column" gap="1">
                      <Text as="div" size="2" style={{ opacity: 0.7 }}>
                        {c.title}
                      </Text>
                      <Text as="div" size="4" weight="bold">
                        {c.headline}
                      </Text>
                    </Flex>
                  </Flex>

                  <Text
                    as="div"
                    size="2"
                    style={{ opacity: 0.78, lineHeight: 1.7 }}
                  >
                    {c.desc}
                  </Text>
                </Flex>
              </Box>
            ))}
          </div>

          {!isConnected ? (
            <div
              className="st-connectStrip"
              data-attn={showConnectHint ? "1" : "0"}
            >
              <Flex align="center" justify="between" gap="3" wrap="wrap">
                <Flex direction="column" gap="1">
                  <Text as="div" weight="bold" size="3">
                    Connect wallet
                  </Text>
                  <Text
                    as="div"
                    size="2"
                    style={{ opacity: 0.72, lineHeight: 1.6 }}
                  >
                    Required to enter any flow.
                  </Text>
                </Flex>

                <ConnectButton
                  connectText="Connect / Login"
                  walletFilter={(w) =>
                    isEnokiWallet(w) || w.name === "Slush" || true
                  }
                />
              </Flex>
            </div>
          ) : (
            <Flex align="center" gap="2" wrap="wrap">
              <Text
                as="div"
                size="2"
                style={{ opacity: 0.65 }}
                title={account.address} // hover shows full address
              >
                Connected as {account.address.slice(0, 6)}…
                {account.address.slice(-4)}
              </Text>

              <CopyPill
                value={account.address}
                label="Copy address"
                toastMsg="Address copied"
              />
            </Flex>
          )}
        </Flex>
      </Reveal>

      {/* HOW */}
      <div ref={howAnchorRef} className="st-homeSectionAnchor" />
      <Reveal>
        <Flex direction="column" gap="4">
          <Heading as="h2" size="6">
            How it works
          </Heading>

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

          <Flex justify="center" gap="2" wrap="wrap">
            <Button
              variant="ghost"
              color="gray"
              onClick={() => scrollTo(rolesAnchorRef.current)}
            >
              Back to roles
            </Button>
            <Button
              variant="ghost"
              color="gray"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Back to top
            </Button>
          </Flex>
        </Flex>
      </Reveal>
    </Flex>
  );
}
