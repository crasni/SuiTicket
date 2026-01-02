import { Outlet, NavLink } from "react-router-dom";
import { ConnectButton } from "@mysten/dapp-kit";
import { Box, Container, Flex, Text } from "@radix-ui/themes";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  textDecoration: "none",
  padding: "8px 10px",
  borderRadius: 10,
  opacity: isActive ? 1 : 0.7,
  background: isActive ? "var(--gray-a3)" : "transparent",
});

export default function AppShell() {
  return (
    <Box>
      <Box style={{ borderBottom: "1px solid var(--gray-a4)" }}>
        <Container size="3" style={{ padding: "14px 16px" }}>
          <Flex align="center" justify="between" gap="3">
            <Flex align="center" gap="4">
              <Text size="4" weight="bold">
                SuiTicket
              </Text>

              <Flex gap="2" wrap="wrap">
                <NavLink to="/" style={linkStyle}>
                  Explore
                </NavLink>
                <NavLink to="/tickets" style={linkStyle}>
                  My Tickets
                </NavLink>
                <NavLink to="/staff" style={linkStyle}>
                  Staff
                </NavLink>
                <NavLink to="/create" style={linkStyle}>
                  Create
                </NavLink>
              </Flex>
            </Flex>

            <ConnectButton />
          </Flex>
        </Container>
      </Box>

      <Container size="3" style={{ padding: "18px 16px" }}>
        <Outlet />
      </Container>
    </Box>
  );
}
