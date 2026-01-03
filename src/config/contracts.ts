export const LEGACY_PACKAGE_ID =
  "0xe01cdc2f8745ead1192580fa23b9e1b4d12169f9283a31936ae72f8f04bba06b";

// NEW package id comes from .env.local
export const CURRENT_PACKAGE_ID =
  import.meta.env.VITE_TICKET_PACKAGE_ID ?? LEGACY_PACKAGE_ID;

export const DEFAULT_PACKAGE_ID = CURRENT_PACKAGE_ID;

export const TICKET_MODULE = "ticket";

export function tgt(fn: string, packageId = CURRENT_PACKAGE_ID) {
  return `${packageId}::${TICKET_MODULE}::${fn}`;
}

/**
 * NEW (Option A): shared EventRegistry object id (created by init_registry).
 * Put this in .env.local as:
 *   VITE_TICKET_REGISTRY_ID=0x...
 */
export const EVENT_REGISTRY_ID: string | undefined = import.meta.env
  .VITE_TICKET_REGISTRY_ID;

export const TARGETS = {
  // CHANGED signature in Move: create_event(reg: &mut EventRegistry, ...)
  createEvent: tgt("create_event"),

  // Optional helper target (call once after deploy)
  initRegistry: tgt("init_registry"),

  buyTicket: tgt("buy_ticket"),
  redeem: tgt("redeem"),
  issuePermit: tgt("issue_permit"),
  redeemWithPermit: tgt("redeem_with_permit"),
};
