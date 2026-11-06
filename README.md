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

See [backend/.env.example](./backend/.env.example) and [API-DESIGN.md](./API-DESIGN.md). The public page uses health, application-intake, and public-directory routes; reviewer credentials are never embedded in the site.

## Organization applications and directory

The initial application workflow accepts charity, vendor, and enterprise applications. Authorized reviewers can move applications through `submitted`, `in_review`, `verified`, and `rejected`; only charities explicitly opting into publication and marked `verified` appear in the public directory. Review status is an internal decision, not an IRS certification or XRPL account-verification claim.

Application records use PostgreSQL. Contact details, organization name, EIN, website, and any unpublished profile content are encrypted with AES-256-GCM before storage. The intake endpoint also requires Cloudflare Turnstile. To enable it, create a Render PostgreSQL database in the service region and use its internal connection URL; configure `DATABASE_URL`, `APPLICATION_DATA_KEY` (`openssl rand -hex 32`), and `TURNSTILE_SECRET_KEY`; set the public Turnstile site key in the `turnstile-site-key` meta tag in `index.html`, then run `cd backend && npm run db:migrate`. Keep the encryption key in deployment secrets and maintain a protected backup; losing it makes private application data unreadable. Do not rotate the key without first re-encrypting stored records.

Reviewer API tokens must include only the `applications:review` scope where possible. Create a high-entropy token with `openssl rand -hex 32`, store only its SHA-256 hash in `API_TOKENS_JSON`, and deliver the token to the invited reviewer through a separate secure channel. The current workflow does not accept donations or create Xaman signing requests; those remain closed while the Testnet custody and escrow lifecycle is built and verified.

## Links

- Site: [verichar.net](https://verichar.net)
- XRPL docs: [xrpl.org](https://xrpl.org)
- Ripple: [ripple.com](https://ripple.com)
- X: [@VeriCharOnChain](https://x.com/VeriCharOnChain)
