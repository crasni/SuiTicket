export type ToastKind = "success" | "error" | "info";

export type ToastPayload = {
  id?: string;
  kind?: ToastKind;
  title: string;
  description?: string;
  durationMs?: number;
};

const EVT = "__suiticket_toast";

function emit(payload: ToastPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVT, {
      detail: {
        ...payload,
        id:
          payload.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      } satisfies ToastPayload,
    }),
  );
}

export const toast = {
  show: (title: string, opts?: Omit<ToastPayload, "title">) =>
    emit({ title, ...opts }),

  success: (title: string, description?: string) =>
    emit({ kind: "success", title, description }),

  error: (title: string, description?: string) =>
    emit({ kind: "error", title, description }),

  info: (title: string, description?: string) =>
    emit({ kind: "info", title, description }),
};

export function toastEventName() {
  return EVT;
}
