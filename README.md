# VeriChar.Net

**The verification standard for charitable giving on XRPL.**  
Proof before payment. Charity people can actually verify.

VeriChar aims to be the gold standard (the BBB of giving): easily integrated, cheap, efficient, and compliant, while enforcing that funds only move after itemized invoice + proof of delivery are verified.

**Core principle:** Funds lock until an itemized invoice and proof of delivery check out — then they go straight to the vendor. The charity never freely controls the cash.

## Current Status

Working prototype. Public demo is a simulation. Backend escrow helpers pass live **XRP Ledger Testnet** CI. No real donations or Mainnet funds.

Draft documents:  
[verichar-whitepaper-v0.7.pdf](./verichar-whitepaper-v0.7.pdf) · [verichar-whitepaper-v0.7.md](./verichar-whitepaper-v0.7.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [PUBLIC-IDENTITY.md](./PUBLIC-IDENTITY.md) · [SECURITY.md](./SECURITY.md)

## Architecture Direction (in progress)

We are moving toward a structure where each verified 501(c)(3) receives a dedicated XRPL account under controlled multi-signature rules. Escrows on that account still require dual proof (invoice + delivery) before funds can be released to a vendor. This improves the path to tax compliance while preserving the pure verification model.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the detailed design, aligned with official XRPL multi-signing and escrow documentation.

## Giving Network (free)

Donors, charities, and vendors — no settlement take-rate on core giving flows.

## Enterprise SaaS (paid)

Analytics for audits and CSR/impact reporting, tax compliance workflows, and structured exports. Not legal or tax advice.

## XRPL Testnet verification status

Backend integration tests run on every push to `main` (GitHub Actions). Live **XRP Ledger Testnet** checks include faucet wallets, conditional EscrowCreate / EscrowFinish / EscrowCancel, fee formula per xrpl.org, vendor balance change, and reserve reads.

## Backend

```sh
cd backend && npm ci && npm test && npm start
```

See [backend/.env.example](./backend/.env.example) and [API-DESIGN.md](./API-DESIGN.md). Public page uses `/healthz` only; browser never receives an API token.
