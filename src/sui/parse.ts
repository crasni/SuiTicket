// src/sui/parse.ts
import type { SuiObjectResponse } from "@mysten/sui/client";

export type ParsedMoveObject = {
  objectId: string;
  type?: string;
  fields?: Record<string, any>;
  owner?: any;
};

export function parseMoveObject(o: SuiObjectResponse): ParsedMoveObject | null {
  const data: any = o.data;
  if (!data) return null;

  const objectId = data.objectId as string;
  const type = data.type as string | undefined;

  const fields =
    data.content && data.content.dataType === "moveObject"
      ? (data.content.fields as Record<string, any>)
      : undefined;

  return {
    objectId,
    type,
    fields,
    owner: data.owner,
  };
}

export function getSharedVersion(owner: any): string | null {
  // owner = { Shared: { initial_shared_version: "123" } } (string)
  if (!owner || typeof owner !== "object") return null;
  if (!("Shared" in owner)) return null;
  const v = owner.Shared?.initial_shared_version;
  return v ? String(v) : null;
}

export function u8vecToString(v: any): string {
  // Move vector<u8> often arrives as number[] or string
  if (!v) return "";
  try {
    if (typeof v === "string") return v; // sometimes already decoded
    if (Array.isArray(v)) {
      return new TextDecoder().decode(new Uint8Array(v));
    }
    return String(v);
  } catch {
    return String(v);
  }
}

export function mistToSui(mist: bigint): string {
  // 1 SUI = 1e9 MIST
  const sign = mist < 0n ? "-" : "";
  const x = mist < 0n ? -mist : mist;

  const whole = x / 1_000_000_000n;
  const frac = x % 1_000_000_000n;

  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return fracStr.length ? `${sign}${whole}.${fracStr}` : `${sign}${whole}`;
}

export function suiToMist(s: string): bigint {
  const [a, b = ""] = s.trim().split(".");
  const frac = (b + "000000000").slice(0, 9);
  return BigInt(a || "0") * 1_000_000_000n + BigInt(frac);
}
