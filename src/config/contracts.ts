// TODO: 等 Role 3/合約定版後再填真的
export const TICKET_PACKAGE_ID = "0xYOUR_PACKAGE_ID";

// 你們合約如果是 ticket.move / module ticket，這裡就長這樣：
export const TICKET_MODULE = "ticket";

// 你們的核銷 entry function 名字（redeem/use_ticket/check_in 都行）
export const REDEEM_FN = "redeem";

// 組合成 Move target: <package>::<module>::<function>
export function redeemTarget() {
  return `${TICKET_PACKAGE_ID}::${TICKET_MODULE}::${REDEEM_FN}`;
}
