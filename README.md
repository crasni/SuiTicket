# SuiStage — Local Test (Testnet)

This repo contains a minimal ticketing flow on Sui:

**Create Event → Buy Ticket (paid) → Redeem (check-in)**

---

## Prerequisites
- **Sui CLI** installed and working:
  ```bash
  sui --version
  ```
- **Node.js + pnpm**
- Wallet set to **Sui Testnet** (e.g. Suiet / Backpack)

---

## 1) Configure Sui CLI (Testnet)
```bash
sui client envs
sui client switch --env testnet
sui client active-env
sui client active-address
```

(Optional) Get testnet SUI:
```bash
sui client faucet
sui client balance
```

---

## 2) Build Move Package (no deploy)
```bash
cd contracts/suistage_ticket_min
sui move build
```

---

## 3) Publish (Deploy) to Testnet
```bash
cd contracts/suistage_ticket_min
sui client publish --gas-budget 100000000
```

After success, copy these from the output:
- **PackageID** (under `Published Objects`)
- **UpgradeCap object id** (under `Created Objects` → `0x2::package::UpgradeCap`)

You will paste **PackageID** into the frontend console.

---

## 4) Upgrade (Redeploy) Later
> Upgrade produces a **new PackageID** (version increases).  
> Always update the frontend to the **latest** package id.

```bash
cd contracts/suistage_ticket_min
sui client upgrade \
  --upgrade-capability <UPGRADE_CAP_ID> \
  --gas-budget 100000000 \
  .
```

After upgrade, copy the new **PackageID** from output.

---

## 5) Run Frontend Locally
```bash
cd web
pnpm install
pnpm dev
```

Open the local dev server in your browser, connect wallet (Testnet).

---

## 6) Test Flow in UI (Test Console)
Recommended click order:
1. **Connect wallet**
2. Paste **Package ID** (latest)
3. (Optional) **Faucet**
4. **Create Event + Cap**
   - Should auto-fill `Event ID` and `GateCap ID`
5. **Buy Ticket**
   - Uses `Price (SUI)` and pays on-chain
   - Should auto-fill `Ticket ID`
6. **Redeem**
   - Marks ticket as used (check-in)
7. **Refresh Owned** (or Lookup) if you want to verify objects/state

---

## Notes / Common Gotchas
- **Package ID changes after upgrade** → paste the newest one in the UI.
- **RPC indexing can lag** (owned list not updated instantly)  
  → press **Refresh Owned** once, or wait a moment and press again.
- If `buy_ticket` fails, check:
  - You have enough **SUI balance** for price + gas
  - You’re on **Testnet**
  - The `Event ID` is from the same package version you’re calling
