# SuiStage Gate (MVP)

A minimal ticketing prototype on Sui Testnet: create events, sell paid tickets, and redeem (check-in) with a gate capability.

## What’s inside

### Move package (`suistage_ticket_min`)
- **Event**: minimal event object with organizer + name (and pricing fields in progress).
- **GateCap**: capability required to redeem tickets for a specific event.
- **Ticket**: ticket object with `used` flag.
- Entry functions:
  - `create_event(name, price, fee_bps, platform_addr)` → creates `Event` + `GateCap`
  - `buy_ticket(event, payment_coin, recipient)` → paid mint/transfer
  - `redeem(ticket, cap)` → marks `used=true` and emits `TicketRedeemed`

### Frontend Test Console (React)
A developer console to exercise the contract:
- Faucet (testnet)
- Create Event + auto-fill new IDs from objectChanges
- Buy Ticket with on-chain payment (splits gas coin)
- Redeem + status updates
- Owned dashboard: lists Events / GateCaps / Tickets for the connected wallet

## Quick start
1. Install deps and run the frontend
2. Connect wallet (Sui Testnet)
3. Faucet → Create Event → Buy Ticket → Redeem
4. Use “Refresh Owned” or “Lookup” to verify ticket status

## Notes
- The package is frequently upgraded during development; update the `PACKAGE_ID` in the console when needed.
- Kiosk / resale flow is planned but not integrated yet.
