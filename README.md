# VeriChar.Net

**Verifiable giving on XRPL.** Charity people can actually verify.

**How:** Funds lock until an itemized invoice and proof of delivery check out — then they go straight to the vendor. Proof before payment. Documented trails when settlement is live.

**Giving network (free):** Donors, charities, and vendors — no settlement take-rate.

**Enterprise SaaS tiers (paid):** Analytics meant to streamline audits and CSR/impact reporting; clearer documentation of giving; less stress and overhead assembling records; exports that can **support** tax and compliance workflows (VeriChar does not file with the IRS for you; not legal or tax advice). Goal: more of each gift reaches the need, with proof that is faster and easier to show.

**Also:** Donations to VeriChar to fund the public rails.

**Status:** Working prototype. Public demo is a simulation. Backend escrow helpers pass live **XRP Ledger Testnet** CI. No real donations or Mainnet funds.

Draft: [verichar-whitepaper-v0.7.pdf](./verichar-whitepaper-v0.7.pdf) · [verichar-whitepaper-v0.7.md](./verichar-whitepaper-v0.7.md) · [PUBLIC-IDENTITY.md](./PUBLIC-IDENTITY.md)

## XRPL Testnet verification status

Backend integration tests run on every push to `main` (GitHub Actions). Live **XRP Ledger Testnet** checks include faucet wallets, conditional EscrowCreate / EscrowFinish / EscrowCancel, fee formula per xrpl.org, vendor balance change, and reserve reads. Recent CI: **37 tests, 0 failures** (22 October 2026). Not Mainnet. Not live donations.

## Backend

```sh
cd backend && npm ci && npm test && npm start
```

See [backend/.env.example](./backend/.env.example) and [API-DESIGN.md](./API-DESIGN.md). Public page uses `/healthz` only; browser never receives an API token.
