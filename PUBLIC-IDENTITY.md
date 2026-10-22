# Public identity (SEO and XRPL)

## Published on purpose

| Field | Value |
|---|---|
| Product | VeriChar / VeriChar.Net |
| Founder | Brianne Salato |
| Email | VeriChar@proton.me |
| Website | https://verichar.net |
| X | https://x.com/VeriCharOnChain |
| Code | https://github.com/VeriCharXRPL/VeriChar.Net |

These appear in HTML meta tags, Open Graph / Twitter cards, JSON-LD (`schema.org`), the founder section, and `.well-known/xrp-ledger.toml` principals.

## Not published on the website

**Employer Identification Number (EIN)** and IRS confirmation details are **not** placed in public HTML, SEO meta, or this repository.

- VeriChar is currently associated with a **sole proprietorship** legal name for tax setup.
- An EIN is for banks, processors, tax forms, and secure vendor onboarding — not for SEO ranking.
- Charities that later join VeriChar may disclose *their* nonprofit EINs in verification flows as product design allows; that is separate from publishing the founder’s sole-proprietor EIN in page source.

Store the EIN offline (password manager / counsel). Share it only through secure channels when a counterparty legitimately needs it.

## XRPL identifiers

Domain linkage uses `https://verichar.net/.well-known/xrp-ledger.toml` plus the account `Domain` field set to `verichar.net`. Add the r-address under `[[ACCOUNTS]]` once the operational wallet exists. EIN is **not** an on-ledger field.
