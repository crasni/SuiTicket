export type TicketQrPayloadV1 = {
  v: 1;
  kind: "ticket";
  ticketId: string;
  eventId?: string;
};

export function makeTicketQrPayload(
  ticketId: string,
  eventId?: string,
): string {
  const payload: TicketQrPayloadV1 = {
    v: 1,
    kind: "ticket",
    ticketId: ticketId.trim(),
    ...(eventId ? { eventId: eventId.trim() } : {}),
  };
  return JSON.stringify(payload);
}

export function parseTicketQrInput(input: string): {
  ticketId: string;
  eventId?: string;
  raw: string;
  kind: "json-v1" | "plain";
} {
  const raw = input.trim();
  if (!raw) return { ticketId: "", raw: "", kind: "plain" };

  // Try JSON payload first
  try {
    const obj = JSON.parse(raw) as any;
    if (
      obj &&
      obj.v === 1 &&
      obj.kind === "ticket" &&
      typeof obj.ticketId === "string"
    ) {
      return {
        ticketId: obj.ticketId.trim(),
        eventId:
          typeof obj.eventId === "string" ? obj.eventId.trim() : undefined,
        raw,
        kind: "json-v1",
      };
    }
  } catch {
    // fallthrough
  }

  // Otherwise treat as a plain object id
  return { ticketId: raw, raw, kind: "plain" };
}
