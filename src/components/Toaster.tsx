import { useEffect, useMemo, useState } from "react";
import { Box, Card, Flex, Text } from "@radix-ui/themes";
import {
  toastEventName,
  type ToastKind,
  type ToastPayload,
} from "../lib/toast";

type ToastItem = Required<Pick<ToastPayload, "id" | "title">> &
  Omit<ToastPayload, "id" | "title">;

function borderFor(kind?: ToastKind) {
  switch (kind) {
    case "success":
      return "var(--green-a6)";
    case "error":
      return "var(--red-a6)";
    default:
      return "var(--gray-a6)";
  }
}

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  const evtName = useMemo(() => toastEventName(), []);

  useEffect(() => {
    function onToast(e: Event) {
      const ce = e as CustomEvent;
      const d = (ce.detail ?? {}) as ToastPayload;
      if (!d.title) return;

      const id = d.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const durationMs = typeof d.durationMs === "number" ? d.durationMs : 2600;

      const item: ToastItem = {
        id,
        title: d.title,
        kind: d.kind,
        description: d.description,
        durationMs,
      };

      setItems((prev) => [...prev.slice(-2), item]);

      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, durationMs);
    }

    window.addEventListener(evtName, onToast);
    return () => window.removeEventListener(evtName, onToast);
  }, [evtName]);

  if (items.length === 0) return null;

  return (
    <Box
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 18,
        zIndex: 2000,
        pointerEvents: "none",
      }}
    >
      <Flex direction="column" gap="2" align="center">
        {items.map((t) => (
          <Card
            key={t.id}
            style={{
              width: "min(560px, calc(100vw - 32px))",
              borderLeft: `5px solid ${borderFor(t.kind)}`,
              boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
              pointerEvents: "none",
            }}
          >
            <Flex direction="column" gap="1">
              <Text weight="medium">{t.title}</Text>
              {t.description ? (
                <Text size="2" style={{ opacity: 0.75 }}>
                  {t.description}
                </Text>
              ) : null}
            </Flex>
          </Card>
        ))}
      </Flex>
    </Box>
  );
}
