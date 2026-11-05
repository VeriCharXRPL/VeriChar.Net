# VeriChar.Net

**Verifiable charity on chain.**  
Charity infrastructure built for transparency and proof.

We built the code to eliminate unverifiable charity flows.  
Proof before payment. Encoded integrity.

**Core principle:** Funds lock until an itemized invoice and proof of delivery both check out. Then they release straight to the vendor. The charity never freely controls the cash.

No opacity. No ambiguity. No unverifiable release.

## Current status

Working prototype. The public site is a simulation. Backend escrow helpers pass live **XRP Ledger Testnet** CI. No real donations or Mainnet funds.

**Draft documents**  
[verichar-whitepaper-v0.8.md](./verichar-whitepaper-v0.8.md) · [verichar-whitepaper-v0.8.pdf](./verichar-whitepaper-v0.8.pdf) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [verichar-whitepaper-v0.7.md](./verichar-whitepaper-v0.7.md) · [PUBLIC-IDENTITY.md](./PUBLIC-IDENTITY.md) · [SECURITY.md](./SECURITY.md)

## Architecture direction

Each verified 501(c)(3) receives a dedicated XRPL account under controlled multi-signature rules. Escrows on that account require dual proof (invoice + delivery) before funds can release to a vendor. This improves the path to tax compliance while preserving the pure verification model.

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [verichar-whitepaper-v0.8.md](./verichar-whitepaper-v0.8.md).

## Giving network (free)

Donors, charities, and vendors — no settlement take-rate on core giving flows.

## Enterprise SaaS (paid)

Analytics for audits and CSR/impact reporting, tax-compliance workflows, and structured exports. Not legal or tax advice. VeriChar does not file returns.

## XRPL Testnet verification

Backend integration tests run on every push to `main` (GitHub Actions). Live **XRP Ledger Testnet** checks include faucet wallets, conditional EscrowCreate / EscrowFinish / EscrowCancel, fee formula per xrpl.org, vendor balance change, and reserve reads.

## Backend

```sh
cd backend && npm ci && npm test && npm start
```

See [backend/.env.example](./backend/.env.example) and [API-DESIGN.md](./API-DESIGN.md). The public page uses `/healthz` only; the browser never receives an API token.

## Links

- Site: [verichar.net](https://verichar.net)
- XRPL docs: [xrpl.org](https://xrpl.org)
- Ripple: [ripple.com](https://ripple.com)
- X: [@VeriCharOnChain](https://x.com/VeriCharOnChain)
