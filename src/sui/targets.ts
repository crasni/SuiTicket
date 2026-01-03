// src/sui/targets.ts
import { DEFAULT_PACKAGE_ID } from "../config/contracts";

export function ticketTargets(packageId = DEFAULT_PACKAGE_ID) {
  const base = `${packageId}::ticket`;
  return {
    createEvent: `${base}::create_event`,
    buyTicket: `${base}::buy_ticket`,
    redeem: `${base}::redeem`,
    grantCap: `${base}::grant_cap`,
    // future:
    // issuePermit: `${base}::issue_permit`,
    // redeemWithPermit: `${base}::redeem_with_permit`,
  };
}
