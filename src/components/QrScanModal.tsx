import { useEffect, useRef, useState } from "react";
import { Button, Card, Flex, Text } from "@radix-ui/themes";
import { BrowserQRCodeReader } from "@zxing/browser";

export default function QrScanModal({
  open,
  onClose,
  onScan,
  title = "Scan QR",
  hint,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
  title?: string;
  hint?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    let stopped = false;
    let controls: any = null;

    async function start() {
      setErr("");

      const el = videoRef.current;
      if (!el) return;

      const codeReader = new BrowserQRCodeReader();

      // Prefer back camera on mobile when possible
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: { facingMode: { ideal: "environment" } as any },
      };

      try {
        controls = await (codeReader as any).decodeFromConstraints(
          constraints,
          el,
          (result: any, _error: any, c: any) => {
            if (stopped) return;
            if (result) {
              stopped = true;
              try {
                c?.stop?.();
              } catch {}
              onScan(String(result.getText?.() ?? result.text ?? result));
              onClose();
            }
          },
        );
      } catch (e: any) {
        setErr(
          [
            "Camera scan failed.",
            String(e?.message ?? e),
            "",
            "Tips:",
            "- Browser camera access usually requires HTTPS (localhost is ok).",
            "- Allow camera permissions in the URL bar.",
          ].join("\n"),
        );
      }

      return () => {
        stopped = true;
        try {
          controls?.stop?.();
        } catch {}
      };
    }

    let cleanup: any;
    start().then((c) => (cleanup = c));

    return () => {
      stopped = true;
      try {
        cleanup?.();
      } catch {}
      try {
        controls?.stop?.();
      } catch {}
    };
  }, [open, onClose, onScan]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(520px, 100%)" }}
      >
        <Card>
          <Flex direction="column" gap="3">
            <Flex align="center" justify="between" gap="3">
              <Text weight="bold">{title}</Text>
              <Button variant="ghost" color="gray" onClick={onClose}>
                Close
              </Button>
            </Flex>

            {hint ? (
              <Text size="2" style={{ opacity: 0.75, whiteSpace: "pre-wrap" }}>
                {hint}
              </Text>
            ) : null}

            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid var(--gray-a5)",
                background: "var(--gray-a2)",
              }}
            >
              <video
                ref={videoRef}
                style={{ width: "100%", height: 320, objectFit: "cover" }}
                muted
                playsInline
              />
            </div>

            {err ? (
              <Text size="2" color="red" style={{ whiteSpace: "pre-wrap" }}>
                {err}
              </Text>
            ) : (
              <Text size="2" style={{ opacity: 0.7 }}>
                Scanning… (move the QR into the frame)
              </Text>
            )}
          </Flex>
        </Card>
      </div>
    </div>
  );
}
