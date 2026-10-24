# VeriChar security protocols

Operational checklist for the XRP Ledger design and for Illinois, before any real value moves.

**Not legal advice. Not a claim of legal immunity.** No architecture is legally impenetrable. These rules reduce custody and fraud surface. They do not cancel statutes, contracts, or lawsuits.

Status today: **Testnet prototype.** The public site is a simulation. The API does not submit product transactions and does not speak to Mainnet.

## XRPL controls enforced in this repo

| Rule | Where |
|---|---|
| Refuse startup unless `XRPL_WS_URL` is `wss://` and the hostname is an official Testnet host | `backend/src/config.js` |
| No Mainnet account route | `backend/src/api.js` |
| Bearer tokens stored only as SHA-256 hashes, one tenant, explicit scopes | `backend/src/config.js`, `backend/src/api.js` |
| Browser is not given an API token; CORS is an exact origin list, never `*` | `backend/src/config.js`, `index.html` |
| Conditional escrow is PREIMAGE-SHA-256 only | `backend/src/condition.js` |
| Every escrow sets `CancelAfter` (Ripple epoch, not Unix) | `backend/src/escrow.js` |
| `EscrowFinish` fee is at least the XRPL.org fulfillment formula | `backend/src/escrow.js` |
| Fulfillment is not written to logs and is not returned to the public site | escrow module; public demo is simulated |
| Count a transaction only if `validated: true` and `tesSUCCESS` | `backend/src/monitor.js` |
| Reserves come from the validated ledger, never a hardcoded number | `backend/src/reserves.js` |
| Full suite, including live Testnet escrow tests, runs on every push to `main` | `.github/workflows/backend-tests.yml` |
| Public API refuses donations, charity verification, tax receipts, and ledger writes | `backend/src/compliance.js`, `backend/src/api.js` |

Ledger behavior is taken from [XRPL.org escrow](https://xrpl.org/docs/concepts/payment-types/escrow) and the conditional-escrow tutorial. If this repo and XRPL.org disagree about the ledger, XRPL.org wins.

## Required before real funds

Not done. Do not market these as live.

1. Fulfillment and seeds live only in a secret store. Never in git, frontend bundles, or logs.
2. Independent security review of release authority: who can finish an escrow, and who can see the fulfillment.
3. Oracle checks for invoice and delivery are real, or the product says they are manual. The current oracle is a stub.
4. Testnet-only config stays on until counsel and security review clear a Mainnet change.
5. Incident plan for a bad release, a leaked fulfillment, or a compromised API token.

## Illinois gates

VeriChar does **not** currently solicit or accept real charitable contributions, and it does **not** hold charitable property.

Before that changes, Illinois counsel should confirm at least:

| Topic | Why it is on the list | Official starting point |
|---|---|---|
| Charitable solicitation | Listing needs and inviting gifts in Illinois can be solicitation. Registration is **before** soliciting, unless an exemption actually applies. Soliciting first can add a late fee. | Solicitation for Charity Act, 225 ILCS 460; Ill. Admin. Code tit. 14, § 400.30; [Illinois Attorney General charities](https://www.illinoisattorneygeneral.gov/Consumer-Protection/Charities/) |
| Charitable trusts | A person holding charitable property above the statutory threshold must register. The threshold in the Attorney General’s trust rules has been property over $4,000. | Charitable Trust Act, 760 ILCS 55 |
| Money movement | Non-custody and XRPL escrow can reduce pooled-balance risk. They do not, by themselves, decide a money-transmission question. | Counsel, with the Illinois regulator that licenses money transmission |
| Consumer claims | “Verified,” “proof,” and “tracked” must match what is actually live. | Illinois consumer-protection review with counsel |
| Tax characterization | A donation **to VeriChar** is support for the company unless counsel says otherwise. It is not advertised as a deductible charitable gift. | Tax counsel; not determined by the website |

The “Donate to VeriChar” control on the public site opens email. It does not take payment and it does not write a ledger transaction.

## Explicit non-claims

- XRPL escrow does not eliminate Illinois registration, licensing, privacy, or tax duties.
- A passed Testnet CI run is not Mainnet certification and not a legal opinion.
- Cryptographic proof shows a record was not altered. It does not prove the photographed delivery was honest.
