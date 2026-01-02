module suistage_ticket_min::ticket {
    use sui::event;
    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;

    use sui::coin::{Self, Coin};
    use sui::sui::SUI;

    /// Errors
    const E_ALREADY_USED: u64 = 0;
    const E_WRONG_EVENT:  u64 = 1;

    const E_INSUFFICIENT_PAYMENT: u64 = 2;
    const E_FEE_TOO_HIGH: u64 = 3; // fee_bps > 10000

    // Redeem-permit related
    const E_WRONG_PERMIT_TICKET: u64 = 4;
    const E_NOT_INTENDED: u64 = 5;

    /// Event object (shared)
    public struct Event has key {
        id: UID,
        organizer: address,
        name: vector<u8>,

        price_mist: u64,   // ticket price in MIST (1 SUI = 1e9 MIST)
        fee_bps: u16,      // platform fee bps (e.g. 300 = 3%)
        platform: address, // platform receiver (dummy for now)
    }

    /// Gate capability: holder can issue redeem permits for this event
    public struct GateCap has key {
        id: UID,
        event_id: ID,
    }

    /// Ticket object (owned by holder)
    public struct Ticket has key, store {
        id: UID,
        event_id: ID,
        used: bool,
    }

    /// One-time redeem permit:
    /// - mintable only by staff who has GateCap
    /// - transferred to ticket holder
    /// - consumed & deleted when redeeming
    public struct RedeemPermit has key, drop {
        id: UID,
        ticket_id: ID,
        event_id: ID,
        issuer: address,     // staff who issued this permit (for audit)
        intended: address,   // bound to a specific holder (optional but recommended)
    }

    /// Event emitted when a ticket is redeemed
    public struct TicketRedeemed has copy, drop {
        ticket_id: ID,
        event_id: ID,
        redeemer: address,   // we will emit staff issuer for correctness
    }

    /// Create Event + GateCap and transfer cap to organizer, share event
    public entry fun create_event(
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

        let cap = GateCap {
            id: object::new(ctx),
            event_id: ev_id,
        };

        // Event must be shared so anyone can reference it in buy_ticket
        transfer::share_object(ev);

        // GateCap remains owned; whoever holds it can issue permits
        transfer::transfer(cap, organizer);
    }

    /// Paid buy:
    /// - takes Coin<SUI> payment by value
    /// - extracts exactly price_mist, returns change to buyer
    /// - splits fee to platform, remainder to organizer
    /// - mints Ticket to recipient
    public entry fun buy_ticket(
        event: &Event,
        mut payment: Coin<SUI>,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let price = event.price_mist;
        let paid = coin::value(&payment);
        assert!(paid >= price, E_INSUFFICIENT_PAYMENT);

        // Take exactly `price` out as pay_exact.
        let mut pay_exact = coin::split(&mut payment, price, ctx);

        // Return change (if any) back to buyer (tx sender).
        let change = coin::value(&payment);
        if (change == 0) {
            coin::destroy_zero(payment);
        } else {
            transfer::public_transfer(payment, tx_context::sender(ctx));
        };

        // fee = price * fee_bps / 10000
        // (MVP note: this can overflow on extreme price; fine for typical values)
        let fee_u64 = (price * (event.fee_bps as u64)) / 10000;

        if (fee_u64 > 0) {
            let fee_coin = coin::split(&mut pay_exact, fee_u64, ctx);
            transfer::public_transfer(fee_coin, event.platform);
        };

        // remainder to organizer
        transfer::public_transfer(pay_exact, event.organizer);

        // mint ticket
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

    /// Staff issues a one-time permit for a specific ticket, transferring it to the holder.
    /// This tx MUST be signed by the staff (because it uses GateCap).
    public entry fun issue_permit(
        cap: &GateCap,
        ticket_id: ID,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let p = RedeemPermit {
            id: object::new(ctx),
            ticket_id,
            event_id: cap.event_id,
            issuer: tx_context::sender(ctx),
            intended: recipient,
        };
        transfer::transfer(p, recipient);
    }

    /// Holder redeems by consuming the permit.
    /// This tx only requires holder signature because it uses holder-owned Ticket + Permit.
    public entry fun redeem_with_permit(
        ticket: &mut Ticket,
        permit: RedeemPermit,
        ctx: &mut TxContext
    ) {
        assert!(!ticket.used, E_ALREADY_USED);

        // Permit must match the same event and this exact ticket object
        assert!(ticket.event_id == permit.event_id, E_WRONG_EVENT);
        assert!(object::id(ticket) == permit.ticket_id, E_WRONG_PERMIT_TICKET);

        // Optional but recommended: permit bound to the intended holder
        assert!(tx_context::sender(ctx) == permit.intended, E_NOT_INTENDED);

        ticket.used = true;

        // Emit "redeemer" as staff issuer (not tx sender), since holder submits this tx
        event::emit(TicketRedeemed {
            ticket_id: object::id(ticket),
            event_id: ticket.event_id,
            redeemer: permit.issuer,
        });

        // One-time: delete permit object
        object::delete(permit.id);
    }

    /// (Optional) Keep the original dual-sign redeem if you still want it available:
    /// Requires both holder (Ticket owner) and staff (GateCap owner) signatures.
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
