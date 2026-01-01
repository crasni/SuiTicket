module suistage_ticket_min::ticket {
    use sui::event;

    /// Errors
    const E_ALREADY_USED: u64 = 0;
    const E_WRONG_EVENT:  u64 = 1;

    /// Event object (minimal)
    public struct Event has key {
        id: UID,
        organizer: address,
        name: vector<u8>,
    }

    /// Gate capability: holder can redeem tickets for this event
    public struct GateCap has key {
        id: UID,
        event_id: ID,
    }

    /// Ticket object: `store` => hasPublicTransfer: true (MVP0 convenience)
    public struct Ticket has key, store {
        id: UID,
        event_id: ID,
        used: bool,
    }

    /// Event emitted when a ticket is redeemed
    public struct TicketRedeemed has copy, drop {
        ticket_id: ID,
        event_id: ID,
        redeemer: address,
    }

    /// ✅ FIX: entry functions should NOT return key objects.
    /// Create Event + GateCap and transfer both to sender.
    public entry fun create_event(name: vector<u8>, ctx: &mut TxContext) {
        let organizer = tx_context::sender(ctx);

        let ev = Event {
            id: object::new(ctx),
            organizer,
            name,
        };
        let ev_id = object::id(&ev);

        let cap = GateCap {
            id: object::new(ctx),
            event_id: ev_id,
        };

        transfer::transfer(ev, organizer);
        transfer::transfer(cap, organizer);
    }

    /// Mint a ticket for the given event and transfer to recipient
    public entry fun mint_ticket(event: &Event, recipient: address, ctx: &mut TxContext) {
        let t = Ticket {
            id: object::new(ctx),
            event_id: object::id(event),
            used: false,
        };
        transfer::public_transfer(t, recipient);
    }

    /// Move GateCap to a staff address (only through this module)
    public entry fun grant_cap(cap: GateCap, recipient: address) {
        transfer::transfer(cap, recipient);
    }

    /// Redeem (check-in): requires GateCap for the same event
    public entry fun redeem(ticket: &mut Ticket, cap: &GateCap, ctx: &mut TxContext) {
        assert!(!ticket.used, E_ALREADY_USED);
        assert!(ticket.event_id == cap.event_id, E_WRONG_EVENT);

        ticket.used = true;

        event::emit(TicketRedeemed {
            ticket_id: object::id(ticket),
            event_id: ticket.event_id,
            redeemer: tx_context::sender(ctx),
        });
    }
}
