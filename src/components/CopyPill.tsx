import { CopyIcon } from "@radix-ui/react-icons";
import { Button } from "@radix-ui/themes";
import { copyText } from "../lib/clipboard";

export default function CopyPill({
  value,
  label = "Copy",
  toastMsg,
  size = "1",
}: {
  value: string;
  label?: string;
  toastMsg?: string;
  size?: "1" | "2";
}) {
  return (
    <Button
      size={size}
      variant="soft"
      color="gray"
      className="st-pillBtn"
      onClick={() => copyText(value, toastMsg ?? "Copied")}
    >
      <CopyIcon /> {label}
    </Button>
  );
}
