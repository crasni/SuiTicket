module suistage_ticket_min::ticket {
    use sui::event;
    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;

    use sui::coin::{Self, Coin};
    use sui::sui::SUI;

    // std vector module (for push_back / empty)
    use std::vector;

    /// Errors
    const E_ALREADY_USED: u64 = 0;
    const E_WRONG_EVENT:  u64 = 1;
    const E_INSUFFICIENT_PAYMENT: u64 = 2;
    const E_FEE_TOO_HIGH: u64 = 3; // fee_bps > 10000
    const E_WRONG_TICKET: u64 = 4;

    /// -----------------------------------------------------------------------
    /// NEW: Global registry (shared)
    /// -----------------------------------------------------------------------
    /// Holds a list of Event IDs so the frontend can discover/list events.
    public struct EventRegistry has key {
        id: UID,
        events: vector<ID>,
    }

    /// Event object (shared)
    public struct Event has key {
        id: UID,
        organizer: address,
        name: vector<u8>,

        price_mist: u64,
        fee_bps: u16,
        platform: address,
    }

    /// Gate capability: holder can issue permits / redeem tickets for this event
    public struct GateCap has key {
        id: UID,
        event_id: ID,
    }

    /// Ticket object
    public struct Ticket has key, store {
        id: UID,
        event_id: ID,
        used: bool,
    }

    /// One-time permit (non-copyable) that allows ticket holder to redeem
    /// NOTE: must be `has key` because it contains UID.
    public struct RedeemPermit has key, store {
        id: UID,
        event_id: ID,
        ticket_id: ID,
        issuer: address, // who issued (staff wallet)
    }

    /// Events
    public struct TicketRedeemed has copy, drop {
        ticket_id: ID,
        event_id: ID,
        redeemer: address,
    }

    public struct PermitIssued has copy, drop {
        permit_id: ID,
        ticket_id: ID,
        event_id: ID,
        issuer: address,
        recipient: address,
    }

    /// -----------------------------------------------------------------------
    /// NEW: Init registry (call once, then store the returned object ID off-chain)
    /// -----------------------------------------------------------------------
    /// Creates the shared registry object.
    /// You only need to do this once per deployment/environment (e.g. testnet).
    public entry fun init_registry(ctx: &mut TxContext) {
        let reg = EventRegistry {
            id: object::new(ctx),
            events: vector::empty<ID>(),
        };
        transfer::share_object(reg);
    }

    /// Create Event + GateCap and transfer cap to organizer; share event
    /// CHANGED: now takes &mut EventRegistry so we can push the event ID for discovery.
    public entry fun create_event(
        reg: &mut EventRegistry,
        name: vector<u8>,
        price_mist: u64,
        fee_bps: u16,
        platform: address,
        ctx: &mut TxContext
    ) {
        assert!(fee_bps <= 10000, E_FEE_TOO_HIGH);

        let organizer = tx_context::sender(ctx);

        let ev = Event {
            id: object::new(ctx),
            organizer,
            name,
            price_mist,
            fee_bps,
            platform,
        };
        let ev_id = object::id(&ev);

        // NEW: register for discoverability
        vector::push_back(&mut reg.events, ev_id);

        let cap = GateCap {
            id: object::new(ctx),
            event_id: ev_id,
        };

        transfer::share_object(ev);
        transfer::transfer(cap, organizer);
    }

    /// Paid buy: take Coin<SUI>, split fee + organizer, mint ticket
    public entry fun buy_ticket(
        event: &Event,
        mut payment: Coin<SUI>,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let price = event.price_mist;
        let paid = coin::value(&payment);
        assert!(paid >= price, E_INSUFFICIENT_PAYMENT);

        let mut pay_exact = coin::split(&mut payment, price, ctx);

        let change = coin::value(&payment);
        if (change == 0) {
            coin::destroy_zero(payment);
        } else {
            transfer::public_transfer(payment, tx_context::sender(ctx));
        };

        let fee_u64 = (price * (event.fee_bps as u64)) / 10000;

        if (fee_u64 > 0) {
            let fee_coin = coin::split(&mut pay_exact, fee_u64, ctx);
            transfer::public_transfer(fee_coin, event.platform);
        };

        transfer::public_transfer(pay_exact, event.organizer);

        let t = Ticket {
            id: object::new(ctx),
            event_id: object::id(event),
            used: false,
        };
        transfer::public_transfer(t, recipient);
    }

    /// Move GateCap to staff (module-gated transfer)
    public entry fun grant_cap(cap: GateCap, recipient: address) {
        transfer::transfer(cap, recipient);
    }

    /// Staff issues a one-time permit for a specific ticket id, for this event.
    /// We do NOT need the Ticket object here (staff won't own it).
    public entry fun issue_permit(
        cap: &GateCap,
        ticket_id: ID,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let issuer = tx_context::sender(ctx);

        let permit = RedeemPermit {
            id: object::new(ctx),
            event_id: cap.event_id,
            ticket_id,
            issuer,
        };

        event::emit(PermitIssued {
            permit_id: object::id(&permit),
            ticket_id,
            event_id: cap.event_id,
            issuer,
            recipient,
        });

        transfer::public_transfer(permit, recipient);
    }

    /// Ticket holder redeems using the permit (no staff signature needed).
    /// IMPORTANT: permit is taken BY VALUE so we can delete it (consume it).
    public entry fun redeem_with_permit(
        ticket: &mut Ticket,
        permit: RedeemPermit,
        ctx: &mut TxContext
    ) {
        assert!(!ticket.used, E_ALREADY_USED);
        assert!(ticket.event_id == permit.event_id, E_WRONG_EVENT);
        assert!(object::id(ticket) == permit.ticket_id, E_WRONG_TICKET);

        ticket.used = true;

        event::emit(TicketRedeemed {
            ticket_id: object::id(ticket),
            event_id: ticket.event_id,
            redeemer: tx_context::sender(ctx),
        });

        // delete permit (consume UID). This works because permit is owned.
        let RedeemPermit { id, event_id: _, ticket_id: _, issuer: _ } = permit;
        object::delete(id);
    }

    /// Old redeem flow (dual-sign / staff must touch ticket)
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
