import { Flex, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <Flex align="start" justify="between" gap="3" wrap="wrap">
      <Flex direction="column" gap="1">
        <Text size="6" weight="bold">
          {title}
        </Text>
        {subtitle ? (
          <Text size="2" style={{ opacity: 0.7 }}>
            {subtitle}
          </Text>
        ) : null}
      </Flex>
      {right ? (
        <Flex align="center" gap="2">
          {right}
        </Flex>
      ) : null}
    </Flex>
  );
}
