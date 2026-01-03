import { useEffect, useMemo, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Button, Card, Container, Flex, Text } from "@radix-ui/themes";
import Toaster from "../components/Toaster";
import {
  clearRole,
  defaultPathForRole,
  getRole,
  roleEventName,
  setRole,
  type AppRole,
} from "../lib/role";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  textDecoration: "none",
  padding: "8px 10px",
  borderRadius: 10,
  opacity: isActive ? 1 : 0.7,
  background: isActive ? "var(--gray-a3)" : "transparent",
});

export default function AppShell() {
  const nav = useNavigate();
  const location = useLocation();
  const account = useCurrentAccount();

  const isHome = location.pathname === "/";

  const [role, setRoleState] = useState<AppRole | null>(() => getRole());

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

  const requiredRole = useMemo<AppRole | null>(() => {
    const p = location.pathname;
    if (p === "/") return null;
    if (p.startsWith("/staff")) return "staff";
    if (p.startsWith("/create")) return "organizer";
    if (
      p.startsWith("/explore") ||
      p.startsWith("/tickets") ||
      p.startsWith("/event")
    )
      return "buyer";
    return null;
  }, [location.pathname]);

  const roleLabel = useMemo(() => {
    switch (role) {
      case "buyer":
        return "Buyer";
      case "organizer":
        return "Organizer";
      case "staff":
        return "Staff";
      default:
        return "";
    }
  }, [role]);

  const navItems = useMemo(() => {
    if (!role) return [] as Array<{ to: string; label: string }>;
    switch (role) {
      case "buyer":
        return [
          { to: "/explore", label: "Explore" },
          { to: "/tickets", label: "My Tickets" },
        ];
      case "organizer":
        return [{ to: "/create", label: "Create" }];
      case "staff":
        return [
          { to: "/staff", label: "Check-in" },
          { to: "/staff/events", label: "Events" },
        ];
    }
  }, [role]);

  return (
    <Box>
      <Box
        data-sticky-header="1"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          borderBottom: "1px solid var(--gray-a4)",
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "saturate(180%) blur(12px)",
        }}
      >
        <Container size="3" style={{ padding: "14px 16px" }}>
          <Flex align="center" justify="between" gap="3">
            <Flex align="center" gap="4">
              <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
                <Text size="4" weight="bold">
                  SuiTicket
                </Text>
              </Link>

              {role ? (
                <Flex gap="2" wrap="wrap" align="center">
                  <Text size="2" style={{ opacity: 0.65, marginRight: 4 }}>
                    {roleLabel}
                  </Text>
                  <Flex gap="2" wrap="wrap">
                    {navItems.map((it) => (
                      <NavLink key={it.to} to={it.to} style={linkStyle}>
                        {it.label}
                      </NavLink>
                    ))}
                  </Flex>
                  <Button
                    size="2"
                    variant="soft"
                    color="gray"
                    onClick={() => {
                      clearRole();
                      nav("/");
                    }}
                  >
                    Switch
                  </Button>
                </Flex>
              ) : null}
            </Flex>

            <ConnectButton />
          </Flex>
        </Container>
      </Box>

      <Container size={isHome ? "4" : "3"} style={{ padding: "18px 16px" }}>
        <div key={location.pathname} className="st-page">
          {requiredRole && !account?.address ? (
            <Card style={{ borderRadius: 18 }}>
              <Flex direction="column" gap="3" style={{ padding: 18 }}>
                <Text weight="bold" size="4">
                  Connect your wallet to continue
                </Text>
                <Text size="2" style={{ opacity: 0.75, lineHeight: 1.6 }}>
                  This page requires a connected wallet. Once connected, you can
                  choose your role on the home page.
                </Text>
                <Flex gap="2" wrap="wrap" align="center">
                  <ConnectButton />
                  <Button variant="soft" color="gray" onClick={() => nav("/")}>
                    Back Home
                  </Button>
                </Flex>
              </Flex>
            </Card>
          ) : requiredRole && !role ? (
            <Card style={{ borderRadius: 18 }}>
              <Flex direction="column" gap="3" style={{ padding: 18 }}>
                <Text weight="bold" size="4">
                  Choose a mode to continue
                </Text>
                <Text size="2" style={{ opacity: 0.75, lineHeight: 1.6 }}>
                  Pick how you want to use SuiTicket. You can switch later.
                </Text>
                <Flex gap="2" wrap="wrap" align="center">
                  <Button
                    onClick={() => {
                      setRole(requiredRole);
                      nav(defaultPathForRole(requiredRole));
                    }}
                  >
                    Continue as{" "}
                    {requiredRole === "buyer"
                      ? "Buyer"
                      : requiredRole === "organizer"
                        ? "Organizer"
                        : "Staff"}
                  </Button>
                  <Button variant="soft" color="gray" onClick={() => nav("/")}>
                    Back Home
                  </Button>
                </Flex>
              </Flex>
            </Card>
          ) : requiredRole && role !== requiredRole ? (
            <Card style={{ borderRadius: 18 }}>
              <Flex direction="column" gap="3" style={{ padding: 18 }}>
                <Text weight="bold" size="4">
                  Wrong mode for this page
                </Text>
                <Text size="2" style={{ opacity: 0.75, lineHeight: 1.6 }}>
                  You’re currently in <b>{roleLabel}</b> mode, but this page is
                  for{" "}
                  <b>
                    {requiredRole === "buyer"
                      ? "Buyer"
                      : requiredRole === "organizer"
                        ? "Organizer"
                        : "Staff"}
                  </b>
                  .
                </Text>
                <Flex gap="2" wrap="wrap" align="center">
                  <Button
                    onClick={() => {
                      setRole(requiredRole);
                      nav(defaultPathForRole(requiredRole));
                    }}
                  >
                    Switch to{" "}
                    {requiredRole === "buyer"
                      ? "Buyer"
                      : requiredRole === "organizer"
                        ? "Organizer"
                        : "Staff"}
                  </Button>
                  <Button variant="soft" color="gray" onClick={() => nav("/")}>
                    Back Home
                  </Button>
                </Flex>
              </Flex>
            </Card>
          ) : (
            <Outlet />
          )}
        </div>
      </Container>

      <Toaster />
    </Box>
  );
}
