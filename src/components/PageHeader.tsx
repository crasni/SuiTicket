import { Flex, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  left,
  right,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <Flex align="start" justify="between" gap="3" wrap="wrap">
      <Flex align="start" gap="3" wrap="wrap">
        {left ? <Flex align="center">{left}</Flex> : null}
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
      </Flex>
      {right ? (
        <Flex align="center" gap="2">
          {right}
        </Flex>
      ) : null}
    </Flex>
  );
}
