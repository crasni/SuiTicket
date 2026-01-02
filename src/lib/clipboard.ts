import { toast } from "./toast";

export async function copyText(text: string, message = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older browsers / denied permission:
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  // UX feedback (best-effort)
  try {
    toast.success(message);
  } catch {
    // ignore
  }
}

export async function readText(): Promise<string | null> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}
