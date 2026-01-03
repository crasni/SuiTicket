import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";
import { parseMoveObject, u8vecToString } from "../sui/parse";

// Simple in-memory cache (session-scoped)
const nameCache = new Map<string, string>();

function normalizeIds(ids: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = (raw ?? "").trim();
    if (!id) continue;
    if (!id.startsWith("0x")) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  out.sort();
  return out;
}

export function useEventNames(eventIds: Array<string | undefined | null>) {
  const client = useSuiClient();

  const ids = useMemo(() => normalizeIds(eventIds), [eventIds]);

  const q = useQuery({
    queryKey: ["eventNames", ids],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const missing = ids.filter((id) => !nameCache.has(id));
      if (missing.length === 0) {
        return Object.fromEntries(ids.map((id) => [id, nameCache.get(id)!]));
      }

      const objs = await client.multiGetObjects({
        ids: missing,
        options: { showContent: true, showType: true, showOwner: true },
      });

      for (const o of objs) {
        const p = parseMoveObject(o);
        if (!p?.objectId) continue;
        const f = p.fields;
        // Event.name is usually vector<u8>
        const name = f ? u8vecToString((f as any).name) : "";
        if (name) nameCache.set(p.objectId, name);
      }

      // Return best-effort map (some might still be missing)
      const entries: Array<[string, string]> = [];
      for (const id of ids) {
        const n = nameCache.get(id);
        if (n) entries.push([id, n]);
      }
      return Object.fromEntries(entries);
    },
  });

  return q.data ?? {};
}
