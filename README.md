# VeriChar.Net
Verifiable charity in dev on the XRP Ledger. Donations lock in escrow and release directly to vendors only after an itemized invoice and cryptographic proof of delivery are verified. Proof comes before payment. Free for donors and charities.

The current public draft is [verichar-whitepaper-v0.6.pdf](./verichar-whitepaper-v0.6.pdf) (20 October 2026). It matches the live prototype: the website simulation does not move funds, and the API is Testnet-only. Version 0.5 remains in the repository as the previous draft.

## Backend

The backend targets the XRP Ledger Testnet only. From the repository root, install its dependencies and run the tests with:

```sh
cd backend
npm ci
npm test
```

Start the Testnet-only API with:

```sh
cd backend
npm start
```

Configure `API_TOKENS_JSON` using hashed random bearer tokens as described in [backend/.env.example](./backend/.env.example). The API currently exposes a health check, authenticated tenant context, and Testnet account lookup. It does not yet implement persistent tenant data, transaction submission, OAuth, or Mainnet support. See [API-DESIGN.md](./API-DESIGN.md) for the recommended architecture and remaining production decisions.

The public page checks the API's unauthenticated `/healthz` endpoint and shows whether the backend is reachable. It defaults to the same origin; when the page and API are hosted separately, set the `verichar-api-base-url` meta tag in [index.html](./index.html) to the API origin and configure `API_CORS_ORIGINS` with the exact frontend origin. The browser does not receive an API token. Authenticated account lookup remains an API-client operation, and the donation demo remains simulated.
