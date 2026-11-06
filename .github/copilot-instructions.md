# Copilot instructions for VeriChar.Net

## Project overview

This repository is an XRPL Testnet prototype with a static public-facing site at the repo root and the operational backend in `backend/`. Backend logic includes escrow lifecycle helpers, compliance gates, Testnet account reads, and a PostgreSQL-backed organization application/review workflow. The public site can submit applications and read the public charity directory; donation signing remains disabled.

Read these first when you need context:

- `README.md`
- `ARCHITECTURE.md`
- `API-DESIGN.md`
- `backend/.env.example`

## Build, test, and validation commands

Use the backend as the project entry point:

- Install dependencies:
  - `cd backend && npm ci`
- Start the API server:
  - `cd backend && npm start`
- Run the full test suite:
  - `cd backend && npm test`
- Run a single test file:
  - `cd backend && node --test tests/escrow_test.js`
  - `cd backend && node --test tests/oracle_test.js`
- Run a specific test name pattern:
  - `cd backend && node --test --test-name-pattern "condition" tests/*.js`

CI is configured in `.github/workflows/backend-tests.yml` and runs `npm ci` then `npm test` in `backend/` on every push/PR. There is no lint script or ESLint configuration in `backend/package.json` today; the repo's default validation is the Node built-in test runner.

## Architecture

### Runtime layers

- `backend/src/server.js` boots the API on `PORT` and starts the HTTP server.
- `backend/src/api.js` is the main HTTP layer: it authenticates bearer tokens, validates JSON, exposes `/healthz`, and routes API requests for network/account and credential operations.
- `backend/src/config.js` is the security boundary for runtime config. It strictly enforces Testnet-only WebSocket URLs, allowed XRPL hosts, API token structure, and CORS origin validation.
- `backend/src/client.js` creates and manages XRPL Testnet client connections.
- `backend/src/escrow.js` contains the conditional XRP escrow lifecycle (`EscrowCreate`, `EscrowFinish`, `EscrowCancel`) and specific fee logic.
- `backend/src/condition.js` handles crypto-condition and fulfillment generation/validation.
- `backend/src/compliance.js` enforces business rules and closes compliance gates for donation/receipt/ledger actions.
- `backend/src/applicationData.js` validates organization applications and encrypts private fields.
- `backend/src/applicationStore.js` persists applications and audited reviewer status transitions in PostgreSQL; schema is in `backend/migrations/`.
- `backend/src/oracle.js` and related modules model proof-oracle/verification flows.
- `backend/src/reserves.js`, `backend/src/monitor.js`, and `backend/src/organizationCredential.js` provide account/reserve checks, monitoring, and a Testnet-only XRPL credential exercise.

### Product + security model

The core product idea is a proof-before-payment charitable flow: invoice + delivery proof are required before funds can be released. The code is intentionally aligned to XRPL Testnet patterns for escrow and multi-signing, but it is a prototype and should not be treated as production-ready legal or financial infrastructure.

## Key conventions

- The backend is CommonJS (`require`, `'use strict'`), not ESM.
- Tests are Node built-in tests in `backend/tests/*.js`; they are the repo's primary behavior checks.
- Configuration is intentionally strict: if a URL is not `wss:` on an allowed Testnet host, or if API tokens/CORS settings are malformed, startup fails fast.
- Escrow behavior is explicitly validated: conditions and fulfillments must match, amounts must be positive integers, and `CancelAfter` is required for all escrow creation.
- Keep the service Testnet-only. Do not broaden to Mainnet or relax the allowed-host checks without a clearly justified change and accompanying tests.
- Security-sensitive parameters such as fulfillment content and token hashes are treated as secret/never logged.
- Applicant contact details and EINs are encrypted with AES-256-GCM. Keep `APPLICATION_DATA_KEY` separate from the database, and expose private application data only to `applications:review` tokens.
- Only reviewer actions may change application status. A charity appears in the public directory only after review is marked verified and it opted into listing.
- Do not describe the manual review state as an IRS certification. Mainnet account domain association and nonprofit qualification are separate claims.
- Database schema changes use explicit SQL migrations (`cd backend && npm run db:migrate`); do not silently create or mutate schema during API requests.
- Prefer small helper functions and explicit validation before network calls; the project favors fail-fast checks over permissive parsing.

## Useful references in this repo

- `README.md` for product framing and usage flow
- `ARCHITECTURE.md` for the intended charitable-account + escrow architecture
- `API-DESIGN.md` for endpoint and auth expectations
- `.github/workflows/backend-tests.yml` for the actual CI command set

## When making changes

- Keep edits in the `backend/` service if the behavior is operational logic.
- Update the corresponding tests in `backend/tests/` when changing the runtime contract or escrow logic.
- Do not treat the root `index.html` and demo assets as the authoritative application code unless you are explicitly editing the public demo.
