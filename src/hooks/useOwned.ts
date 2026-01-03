import { useQuery } from "@tanstack/react-query";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import type {
  SuiClient,
  SuiObjectResponse,
  PaginatedObjectsResponse,
} from "@mysten/sui/client";
import { parseMoveObject } from "../sui/parse";
import { CURRENT_PACKAGE_ID } from "../config/contracts";

export type OwnedItem = {
  id: string;
  type: string;
  fields?: Record<string, any>;
  owner?: any;
};

async function fetchAllOwned(
  client: SuiClient,
  owner: string,
): Promise<SuiObjectResponse[]> {
  const out: SuiObjectResponse[] = [];
  let cursor: string | null = null;

  for (let guard = 0; guard < 20; guard++) {
    const resp: PaginatedObjectsResponse = await client.getOwnedObjects({
      owner,
      cursor,
      limit: 50,
      options: {
        showType: true,
        showContent: true,
        showOwner: true,
      },
    });

    out.push(...(resp.data ?? []));
    cursor = resp.nextCursor ?? null;
    if (!cursor) break;
  }

  return out;
}

export function useOwned() {
  const account = useCurrentAccount();
  const client = useSuiClient();

  return useQuery({
    queryKey: ["owned", account?.address],
    enabled: !!account?.address,
    queryFn: async () => {
      const rows = await fetchAllOwned(client, account!.address);

      const events: OwnedItem[] = [];
      const caps: OwnedItem[] = [];
      const tickets: OwnedItem[] = [];

      for (const r of rows) {
        const p = parseMoveObject(r);
        if (!p || !p.type) continue;

        const type = p.type;
        const id = p.objectId;

        if (!type.startsWith(`${CURRENT_PACKAGE_ID}::ticket::`)) continue;

        if (type.endsWith("::Event")) {
          events.push({ id, type, fields: p.fields, owner: p.owner });
        } else if (type.endsWith("::GateCap")) {
          caps.push({ id, type, fields: p.fields, owner: p.owner });
        } else if (type.endsWith("::Ticket")) {
          tickets.push({ id, type, fields: p.fields, owner: p.owner });
        }
      }

      return { events, caps, tickets };
    },
  });
}
