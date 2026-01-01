export const TICKET_PACKAGE_ID =
  "0x56b50e92e7e2039f10f58564dc8adfa9fe61b22337c7965066df964c60905926";

export const TICKET_MODULE = "ticket";
export const REDEEM_FN = "redeem";

export function redeemTarget() {
  return `${TICKET_PACKAGE_ID}::${TICKET_MODULE}::${REDEEM_FN}`;
}
