import { useEffect, useMemo, useRef, useState } from "react";
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

const TAGLINE = "Tickets. Instantly.";
const SUB = "Buy, create, and check-in with QR — without the blockchain noise.";

// Scrollytelling track: each step owns STEP_VH * viewportHeight pixels of scroll.
const STEPS = 3;
const STEP_VH = 0.65;

function clampInt(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

export default function Home() {
  const nav = useNavigate();
  const account = useCurrentAccount();
  const isConnected = !!account?.address;

  const [showConnectHint, setShowConnectHint] = useState(false);

  // Discrete state: only one active step at a time.
  const [step, setStep] = useState<0 | 1 | 2>(0);

  // For clean fade: keep the previous step around briefly, then drop it.
  const [prevStep, setPrevStep] = useState<0 | 1 | 2 | null>(null);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const roleCards = useMemo(
    () =>
      [
        {
          role: "buyer" as const,
          title: "Buy a ticket",
          desc: "Browse events and purchase in a clean, guided flow.",
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
          desc: "Pick event, scan QR, and issue one-time permits.",
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

  function choose(role: AppRole, path: string) {
    if (!isConnected) {
      setShowConnectHint(true);
      toast.info("Connect wallet to continue");
      scrollToStep(1);
      return;
    }
    setRole(role);
    nav(path);
  }

  function easeInOutCubic(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function getHeaderHeight(): number {
    // your header is sticky at top; measure it if possible
    const el =
      document.querySelector<HTMLElement>('[data-sticky-header="1"]') ??
      document.querySelector<HTMLElement>("header") ??
      document.querySelector<HTMLElement>(".st-appHeader") ??
      document.querySelector<HTMLElement>("body > div > div"); // fallback-ish

    if (!el) return 64;
    const h = Math.round(el.getBoundingClientRect().height);
    return h > 0 ? h : 64;
  }

  function smoothScrollTo(targetY: number, durationMs: number) {
    const startY = window.scrollY;
    const delta = targetY - startY;
    if (Math.abs(delta) < 2) return;

    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const e = easeInOutCubic(t);
      window.scrollTo(0, startY + delta * e);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function scrollToStep(stepIndex: number) {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const stepPx = window.innerHeight * STEP_VH;

    // true document top of the scrollytelling track
    const wrapTop = wrap.getBoundingClientRect().top + window.scrollY;

    // IMPORTANT:
    // land in the *middle* of the step-range, not at the boundary,
    // otherwise you can end up still in the previous step due to rounding.
    const bias = stepIndex === 0 ? 0.05 : 0.55; // hero near top, others centered
    const target = wrapTop + (stepIndex + bias) * stepPx;

    smoothScrollTo(target, 500); // longer animation
  }

  // Hide scrollbar only on Home (still scrollable)
  useEffect(() => {
    document.body.classList.add("st-homeBody", "st-hideScroll");
    return () => {
      document.body.classList.remove("st-homeBody", "st-hideScroll");
    };
  }, []);

  // Threshold-based step switching (no continuous morphing)
  useEffect(() => {
    function compute() {
      rafRef.current = null;

      const wrap = wrapRef.current;
      if (!wrap) return;

      const stepPx = window.innerHeight * STEP_VH;
      const totalPx = stepPx * STEPS;

      // IMPORTANT: do NOT subtract header height here
      const wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
      const rel = window.scrollY - wrapTop;

      // Ranges:
      // [0, stepPx) -> 0 (Hero)
      // [stepPx, 2*stepPx) -> 1 (Roles)
      // [2*stepPx, 3*stepPx) -> 2 (How)
      const next = clampInt(Math.floor(rel / stepPx), 0, STEPS - 1) as
        | 0
        | 1
        | 2;

      // Hard clamp at end (prevents weirdness if the user scrolls beyond track)
      if (rel >= totalPx - 1) {
        // stay at last
        if (step !== 2) transitionTo(2);
        return;
      }

      if (next !== step) transitionTo(next);
    }

    function transitionTo(next: 0 | 1 | 2) {
      // cancel any pending cleanup
      if (timerRef.current != null) window.clearTimeout(timerRef.current);

      // keep old visible as outgoing layer
      setPrevStep(step);
      setStep(next);

      // drop outgoing after fade duration
      timerRef.current = window.setTimeout(() => {
        setPrevStep(null);
        timerRef.current = null;
      }, 280);
    }

    function onScroll() {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(compute);
    }
    function onResize() {
      compute();
    }

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Set wrapper height dynamically (no “magic 330vh” mismatch)
  const wrapHeightVh = (STEPS * STEP_VH + 1) * 100; // e.g. 330vh

  return (
    <div
      ref={wrapRef}
      className="st-storyWrap"
      style={{ height: `${wrapHeightVh}vh` }}
    >
      <div className="st-stage">
        {/* HERO */}
        <div
          className={[
            "st-layer",
            step === 0 ? "is-on" : "",
            prevStep === 0 ? "is-off" : "",
          ].join(" ")}
        >
          <div className="st-sectionInner">
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

                <div style={{ height: 8 }} />

                <Flex gap="2" wrap="wrap" align="center">
                  <Button
                    size="3"
                    className="st-press"
                    onClick={() => scrollToStep(1)}
                  >
                    Get started
                  </Button>
                </Flex>
              </Flex>
            </div>
          </div>
        </div>

        {/* ROLES */}
        <div
          className={[
            "st-layer",
            step === 1 ? "is-on" : "",
            prevStep === 1 ? "is-off" : "",
          ].join(" ")}
        >
          <div className="st-sectionInner">
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
                    onClick={() => choose(c.role, c.go)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        choose(c.role, c.go);
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
                    <ConnectButton />
                  </Flex>
                </div>
              ) : (
                <Text as="div" size="2" style={{ opacity: 0.65 }}>
                  Connected as {account.address.slice(0, 6)}…
                  {account.address.slice(-4)}
                </Text>
              )}

              <Flex justify="center">
                <Button
                  variant="ghost"
                  color="gray"
                  onClick={() => scrollToStep(2)}
                >
                  Next
                </Button>
              </Flex>
            </Flex>
          </div>
        </div>

        {/* HOW */}
        <div
          className={[
            "st-layer",
            step === 2 ? "is-on" : "",
            prevStep === 2 ? "is-off" : "",
          ].join(" ")}
        >
          <div className="st-sectionInner">
            <Flex direction="column" gap="4">
              <Heading as="h2" size="6">
                How it works
              </Heading>

              <div className="st-grid3">
                {howCards.map((c) => (
                  <div key={c.title} className="st-featureCard">
                    <Flex direction="column" gap="3">
                      <div className="st-iconChip st-iconChipSoft">
                        {c.icon}
                      </div>
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

              <Flex justify="center">
                <Button
                  variant="ghost"
                  color="gray"
                  onClick={() => scrollToStep(0)}
                >
                  Back to top
                </Button>
              </Flex>
            </Flex>
          </div>
        </div>
      </div>
    </div>
  );
}
