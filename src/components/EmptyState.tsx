import { Card, Flex, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

export default function EmptyState({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <Flex direction="column" gap="2" style={{ padding: 4 }}>
        <Text weight="medium">{title}</Text>
        {desc ? (
          <Text size="2" style={{ opacity: 0.7 }}>
            {desc}
          </Text>
        ) : null}
        {action ? <Flex style={{ marginTop: 8 }}>{action}</Flex> : null}
      </Flex>
    </Card>
  );
}
