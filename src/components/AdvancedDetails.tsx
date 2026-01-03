import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Button, Flex, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

export default function AdvancedDetails({
  open,
  onOpenChange,
  label = "Advanced details",
  children,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  label?: string;
  children: ReactNode;
}) {
  return (
    <Flex direction="column" gap="2">
      <Button
        size="2"
        variant="soft"
        color="gray"
        className="st-pillBtn"
        onClick={() => onOpenChange(!open)}
        style={{ alignSelf: "flex-start" }}
      >
        <Flex align="center" gap="2">
          <Text size="2" style={{ opacity: 0.85 }}>
            {label}
          </Text>
          <ChevronDownIcon
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 160ms ease",
              opacity: 0.9,
            }}
          />
        </Flex>
      </Button>

      {open ? <div>{children}</div> : null}
    </Flex>
  );
}
