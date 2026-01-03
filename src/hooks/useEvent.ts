import { useQuery } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";
import { getSharedVersion, parseMoveObject, u8vecToString } from "../sui/parse";

export type EventView = {
  id: string;
  name: string;
  organizer: string;
  priceMist: bigint;
  priceSui: string;
  feeBps: number;
  platform: string;
  sharedVersion: string | null;
};

export function useEvent(eventId?: string) {
  const client = useSuiClient();

  return useQuery({
    queryKey: ["event", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<EventView> => {
      const obj = await client.getObject({
        id: eventId!,
        options: { showContent: true, showOwner: true, showType: true },
      });

      const p = parseMoveObject(obj);
      if (!p?.fields) throw new Error("Event not found or not a Move object.");

      const f = p.fields;

      const name = u8vecToString(f.name);
      const organizer = String(f.organizer ?? "");
      const priceMist = BigInt(f.price_mist ?? 0);
      const feeBps = Number(f.fee_bps ?? 0);
      const platform = String(f.platform ?? "");

      const sharedVersion = getSharedVersion(p.owner);

      // format SUI (string)
      const whole = priceMist / 1_000_000_000n;
      const frac = priceMist % 1_000_000_000n;
      const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
      const priceSui = fracStr.length ? `${whole}.${fracStr}` : `${whole}`;

      return {
        id: p.objectId,
        name,
        organizer,
        priceMist,
        priceSui,
        feeBps,
        platform,
        sharedVersion,
      };
    },
  });
}
