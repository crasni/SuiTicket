import { useNavigate } from "react-router-dom";

export function BackButton({
  fallbackTo,
  label = "Back",
}: {
  fallbackTo: string;
  label?: string;
}) {
  const nav = useNavigate();

  return (
    <button
      className="st-btn st-btnGhost"
      onClick={() => {
        // Prefer history back if it exists; otherwise go to a known safe page.
        try {
          nav(-1);
        } catch {
          nav(fallbackTo);
        }
      }}
      type="button"
    >
      ← {label}
    </button>
  );
}
