export const DEFAULT_PACKAGE_ID =
  "0xe01cdc2f8745ead1192580fa23b9e1b4d12169f9283a31936ae72f8f04bba06b";

export const TICKET_MODULE = "ticket";
export const REDEEM_FN = "redeem";

export function redeemTarget() {
  return `${DEFAULT_PACKAGE_ID}::${TICKET_MODULE}::${REDEEM_FN}`;
}
