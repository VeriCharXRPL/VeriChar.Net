# VeriChar.Net
Verifiable charity on the XRP Ledger. Donations lock in escrow and release directly to vendors only after an itemized invoice and cryptographic proof of delivery are verified. Proof comes before payment. Free for donors and charities.

## Backend

The backend targets the XRP Ledger Testnet only. From the repository root, install its dependencies and run the tests with:

Node.js 20.19.0 or newer is required by the current `xrpl.js` dependency.
Backend-generated Testnet transactions include public memo data identifying the application as `VeriChar`. This is only a ledger label, not verified proof of origin; XRPL account addresses remain the transaction identities.

```sh
cd backend
npm ci
npm test
```

The tests use Node's built-in test runner. API authentication tests compute SHA-256 hashes of fixed, test-only bearer tokens in memory; these are fixtures, not hashes of the test run, and are not printed or saved. Runtime API token hashes are configured separately through `API_TOKENS_JSON` as described in [backend/.env.example](./backend/.env.example).

Start the Testnet-only API with:

```sh
cd backend
npm start
```

Configure `API_TOKENS_JSON` using hashed random bearer tokens as described in [backend/.env.example](./backend/.env.example). The API currently exposes a health check, authenticated tenant context, and Testnet account lookup. It does not yet implement persistent tenant data, transaction submission, OAuth, or Mainnet support. See [API-DESIGN.md](./API-DESIGN.md) for the recommended architecture and remaining production decisions.

The public page checks the API's unauthenticated `/healthz` endpoint and shows whether the backend is reachable. It defaults to the same origin; when the page and API are hosted separately, set the `verichar-api-base-url` meta tag in [index.html](./index.html) to the API origin and configure `API_CORS_ORIGINS` with the exact frontend origin. The browser does not receive an API token. Authenticated account lookup remains an API-client operation, and the donation demo remains simulated.
