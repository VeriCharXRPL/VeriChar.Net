# VeriChar.Net

**Verifiable giving on XRPL.** Charity people can actually verify.

**How:** Funds lock until an itemized invoice and proof of delivery check out — then they go straight to the vendor. Proof before payment.

**Model:** Free for donors, charities, and vendors. Support the build by donating to VeriChar or licensing enterprise SaaS. No settlement take-rate on giving flows.

**Status:** Working prototype. Public demo is a simulation. Backend escrow helpers pass live **XRP Ledger Testnet** CI. No real donations or Mainnet funds.

The current public draft is [verichar-whitepaper-v0.7.pdf](./verichar-whitepaper-v0.7.pdf) (22 October 2026). Source: [verichar-whitepaper-v0.7.md](./verichar-whitepaper-v0.7.md). PDF versions 0.5 and 0.6 remain as prior drafts. Public identity notes: [PUBLIC-IDENTITY.md](./PUBLIC-IDENTITY.md).

## XRPL Testnet verification status

Backend integration tests run automatically on every push to `main` via GitHub Actions (`.github/workflows/backend-tests.yml`). The suite includes **live XRP Ledger Testnet** checks (not Mainnet):

- Connect to allowlisted Testnet WebSocket hosts
- Fund wallets from the Testnet faucet
- Conditional **EscrowCreate** / **EscrowFinish** / **EscrowCancel** (PREIMAGE-SHA-256)
- EscrowFinish fee formula aligned with [xrpl.org EscrowFinish](https://xrpl.org/docs/references/protocol/transactions/types/escrowfinish)
- Vendor balance change after finish; reserve reads via `server_state` / `account_info`

As of **22 October 2026**, those runs complete successfully (**37 tests, 0 failures** in recent CI). Logs are public under the repository **Actions** tab. This does **not** mean VeriChar processes real donations or Mainnet funds. The public site and donation demo remain simulations.

## Backend

The backend targets the XRP Ledger Testnet only. From the repository root:

```sh
cd backend
npm ci
npm test
npm start
```

Configure `API_TOKENS_JSON` using hashed random bearer tokens as described in [backend/.env.example](./backend/.env.example). The API exposes a health check, authenticated tenant context, and Testnet account lookup. It does not yet implement persistent tenant data, product transaction submission, OAuth, or Mainnet support. See [API-DESIGN.md](./API-DESIGN.md).

The public page checks `/healthz` and shows whether the backend is reachable. Set `verichar-api-base-url` in [index.html](./index.html) when the API is on another origin, and configure `API_CORS_ORIGINS`. The browser does not receive an API token. The donation demo remains simulated.
