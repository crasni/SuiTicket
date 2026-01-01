# SuiStage Role 5 — Gate Check-in (MVP0)

A minimal “gate / check-in” dApp for the SuiStage ticketing project.

This repo focuses on **Role 5**: verifying and redeeming (check-in) tickets at the event gate.
For MVP0, we prioritize a working frontend pipeline:
- Connect wallet
- Read on-chain objects (Ticket lookup)
- Build & submit a transaction (CP1), then later swap to real `redeem` Move call (CP2)

> Note: We **do NOT** implement x402 in this repo (explicitly out of scope).

---

## Tech Stack

- Frontend: React + TypeScript + Vite
- Sui: `@mysten/dapp-kit` + Sui Client
- State/query: `@tanstack/react-query`

---

## Goals (MVP0)

### MVP0 Scope
- ✅ Wallet connect (dapp-kit)
- ✅ Lookup a Sui object by object id (`getObject`, show owner/type/content)
- ⏳ Submit a guaranteed-success transaction (CP1: self-transfer test)
- ⏳ Integrate real ticket `redeem/use_ticket` Move call once the contract interface is finalized (CP2)

### Out of scope (for now)
- x402 payment flow
- Sponsored transactions (Enoki sponsor)
- Dynamic QR token (anti-screenshot)
- Backend / DB (will come in later MVPs)

---

## Project Status (Checkpoints)

- [x] **CP0**: One network config + wallet connect + object lookup works
- [ ] **CP1**: Tx sign+execute pipeline works (self-transfer test)
- [ ] **CP2**: Real redeem succeeds on final ticket contract

---

## Quick Start

### Requirements
- Node.js (>= 18)
- pnpm (recommended)

### Install & Run
```bash
pnpm install
pnpm dev
```
