import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { ticketTargets } from "../sui/targets";
import { suiToMist } from "../sui/parse";
import { EVENT_REGISTRY_ID } from "../config/contracts";

function strToU8Vector(s: string): number[] {
  return Array.from(new TextEncoder().encode(s));
}

export function useTicketActions() {
  const client = useSuiClient();

  // ✅ dapp-kit v1 style: pass a custom execute to get objectChanges, etc.
  const { mutateAsync: signAndExec } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          // required so effects can be reported back to wallet
          showRawEffects: true,
          // what we actually want for UI
          showEffects: true,
          showObjectChanges: true,
          showEvents: true,
        },
      }),
  });

  async function createEvent(args: {
    name: string;
    priceSui: string;
    feeBps: number;
    platform: string;
    packageId?: string;
    /**
     * Optional override (useful for dev/testing).
     * If omitted, uses VITE_TICKET_REGISTRY_ID via EVENT_REGISTRY_ID.
     */
    registryId?: string;
  }) {
    const targets = ticketTargets(args.packageId);
    const tx = new Transaction();
    tx.setGasBudget(25_000_000);

    const registryId = args.registryId ?? EVENT_REGISTRY_ID;
    if (!registryId) {
      throw new Error(
        "Missing EventRegistry id. Set VITE_TICKET_REGISTRY_ID in .env.local (after calling init_registry once).",
      );
    }

    // ✅ IMPORTANT:
    // For shared objects, prefer tx.object(id) unless you already know initialSharedVersion.
    // Move will enforce mutability via &mut EventRegistry in the function signature.
    const regArg = tx.object(registryId);

    tx.moveCall({
      target: targets.createEvent,
      arguments: [
        regArg,
        tx.pure.vector("u8", strToU8Vector(args.name)),
        tx.pure.u64(suiToMist(args.priceSui)),
        tx.pure.u16(args.feeBps),
        tx.pure.address(args.platform),
      ],
    });

    return signAndExec({
      transaction: tx,
      chain: "sui:testnet",
    });
  }

  async function buyTicket(args: {
    eventId: string;
    eventSharedVersion: string; // Event is shared => required
    priceMist: bigint;
    recipient: string;
    packageId?: string;
  }) {
    const targets = ticketTargets(args.packageId);
    const tx = new Transaction();
    tx.setGasBudget(25_000_000);

    const [payCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(args.priceMist)]);

    const eventArg = tx.sharedObjectRef({
      objectId: args.eventId,
      initialSharedVersion: args.eventSharedVersion,
      mutable: false,
    });

    tx.moveCall({
      target: targets.buyTicket,
      arguments: [eventArg, payCoin, tx.pure.address(args.recipient)],
    });

    return signAndExec({
      transaction: tx,
      chain: "sui:testnet",
    });
  }

  async function lookupTicket(ticketId: string) {
    return client.getObject({
      id: ticketId,
      options: { showContent: true, showOwner: true, showType: true },
    });
  }

  return { createEvent, buyTicket, lookupTicket };
}
