import { Card, Flex, Text } from "@radix-ui/themes";
import TestConsole from "../components/TestConsole";
import { LEGACY_PACKAGE_ID } from "../config/contracts";

export default function DebugConsole() {
  return (
    <Flex direction="column" gap="4">
      <Text size="6" weight="bold">
        Debug
      </Text>
      <Card>
        <TestConsole packageId={LEGACY_PACKAGE_ID} />
      </Card>
    </Flex>
  );
}
