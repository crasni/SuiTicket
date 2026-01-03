import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { Button } from "@radix-ui/themes";
import { useNavigate } from "react-router-dom";

export default function BackButton({
  fallbackTo,
  label = "Back",
}: {
  /**
   * Where to go if there is no meaningful history entry (deep link).
   */
  fallbackTo: string;
  label?: string;
}) {
  const nav = useNavigate();

  function onBack() {
    const idx =
      typeof window !== "undefined" &&
      window.history?.state &&
      typeof window.history.state.idx === "number"
        ? (window.history.state.idx as number)
        : 0;

    if (idx > 0) nav(-1);
    else nav(fallbackTo);
  }

  return (
    <Button
      size="2"
      variant="solid"
      color="indigo"
      highContrast
      onClick={onBack}
      style={{ gap: 6 }}
    >
      <ArrowLeftIcon />
      {label}
    </Button>
  );
}
