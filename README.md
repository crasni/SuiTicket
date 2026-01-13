# SuiTicket (SuiStage) — Minimal Ticketing dApp on Sui

A minimal end-to-end ticket flow on **Sui Testnet**:

**Create Event → Buy Ticket (paid) → Check-in (redeem)**  
with an optional **staff-issued one-time permit** flow.

---

## What’s inside

### On-chain (Move)

Located in `contracts/suistage_ticket_min`:

-   `Event` (shared): event metadata + pricing
-   `Ticket` (owned): buyer’s ticket, can be redeemed once
-   `GateCap` (owned): staff/organizer capability to issue check-in permits
-   `RedeemPermit` (owned, one-time): issued by staff, consumed by buyer at redeem
-   `EventRegistry` (shared): simple registry so frontend can list/discover events

### Frontend (React + Vite)

-   Wallet connection via `@mysten/dapp-kit`
-   Event listing + detail + purchase
-   My Tickets view (ticket QR display)
-   Staff check-in page (scan/paste ticket id → issue permit)

---

## Prerequisites

-   **Sui CLI** installed
    ```bash
    sui --version
    ```
-   **Node.js + pnpm**
-   A wallet on **Sui Testnet** (Slush / Suiet / Backpack, etc.)

---

## 1) Configure Sui CLI (Testnet)

```bash
sui client switch --env testnet
sui client active-address
```

Make sure you have Testnet SUI for gas.

---

## 2) Publish the Move package

```bash
cd contracts/suistage_ticket_min
sui client publish --gas-budget 100000000
```

After it succeeds, copy from the output:

-   **Package ID**
-   (Optional) **UpgradeCap** object id (if you plan to upgrade later)

---

## 3) Create the shared EventRegistry (one-time)

This creates and shares the global registry object used by the Explore page.

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module ticket \
  --function init_registry \
  --gas-budget 20000000
```

Copy the **shared object id** for `EventRegistry` from the transaction result.

---

## 4) Frontend setup

From repo root:

```bash
pnpm install
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Required
VITE_TICKET_PACKAGE_ID=<PACKAGE_ID>
VITE_TICKET_REGISTRY_ID=<EVENT_REGISTRY_SHARED_OBJECT_ID>

# Optional (zkLogin via Enoki)
VITE_ENOKI_API_KEY=
VITE_GOOGLE_CLIENT_ID=
# Optional override (defaults to testnet in code)
VITE_SUI_NETWORK=testnet
```

> Note: the code expects `VITE_ENOKI_API_KEY` (not `VITE_ENOKI_PUBLIC_KEY`).

---

## 5) Run the app

```bash
pnpm dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

---

## Usage guide (3 roles)

### Organizer — Create Event

1. Connect wallet
2. Go to **Create Event** (`/create`)
3. Enter name / price / fee / platform address
4. Submit → event is shared and its ID is appended to the registry  
   You also receive a **GateCap**.

### Buyer — Buy Ticket

1. Go to **Explore** (`/explore`) → pick an event
2. **Buy Ticket** → a `Ticket` object is minted to your wallet
3. View in **My Tickets** (`/tickets`) and show the ticket QR

### Staff — Check-in

1. Organizer transfers **GateCap** to staff (in-app or via wallet transfer if supported)
2. Staff goes to **Staff** (`/staff`)
3. Scan/paste ticket id → **Issue Permit** to the attendee
4. Attendee redeems (permit is consumed, ticket becomes `used = true`)

---

## Upgrading the contract later

If you publish an upgrade, **Package ID changes**.  
Update:

-   `VITE_TICKET_PACKAGE_ID` in `.env.local`

(Registry can stay the same if you keep using the same shared registry object and your frontend targets are updated accordingly.)

---

## Common gotchas

-   **Indexing lag** on Testnet: newly created objects may not show instantly.
    -   Refresh once, or wait a few seconds then refresh again.
-   `buy_ticket` fails:
    -   Ensure you have enough Testnet SUI for **price + gas**
    -   Ensure you’re on **Testnet**
    -   Ensure frontend uses the latest **Package ID**
-   zkLogin:
    -   Google OAuth redirect must include:
        -   `http://localhost:5173/auth` (dev)
        -   `<your deployed domain>/auth` (prod)

---

## Scripts

```bash
pnpm dev       # run locally
pnpm build     # production build
pnpm preview   # preview production build locally
pnpm lint
```
