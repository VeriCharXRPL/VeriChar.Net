<p align="center"><img src="assets/logo-hero-recolored.png" alt="VeriChar.Net" width="220"></p>

# VeriChar Whitepaper

**Verifiable charity on chain**  
*Charity infrastructure built for transparency and proof.*

**Brianne Salato**  
Founder and Product Architect

Brianne Salato founded VeriChar to develop practical XRPL infrastructure for accountable charitable giving. Her work focuses on clear fund flows, defined release conditions, and evidence that can be reviewed. VeriChar is a working prototype, and this paper distinguishes the intended model from what is currently live.

**Version 0.9 (Draft)** · 21 November 2026  
[verichar.net](https://verichar.net) · [VeriChar@proton.me](mailto:VeriChar@proton.me) · X: [@VeriCharOnChain](https://x.com/VeriCharOnChain)

---

## Document status

This is **Version 0.9**, a draft. It replaces Version 0.8 and reflects the fully non-custodial architecture. The native conditional escrow flow has **passed XRP Ledger Testnet**.

**What changed from 0.8**

| Topic | v0.8 | v0.9 |
|---|---|---|
| Account model | Dedicated XRPL account per verified 501(c)(3) under controlled multi-signature rules | The donor creates a native XRPL conditional escrow from their own wallet, payable to the vendor for a specific charity-listed need |
| Custody and control | Multi-signature rules on the charity account; fulfillment custody as an operational control | VeriChar never holds funds, private keys, release keys, or escrow fulfillments, and never co-signs. Nobody holds the funds. The ledger locks them. |
| Release path | Verification service supplies the fulfillment after dual proofs | A double-oracle model: two independent oracles, neither operated by VeriChar, confirm delivery and trigger EscrowFinish automatically |
| Tokens | Token escrow remaining to be confirmed on Testnet | TokenEscrow was enabled 12 February 2026. RLUSD escrows are possible if the issuer permits, which avoids price volatility |
| Status | Working prototype; Testnet CI passing | **Testnet has been passed.** The public website and demonstration remain simulations. No real donations or Mainnet funds are processed. |

VeriChar remains a **working prototype**. The public website and demonstration are **simulations**. No real donations or Mainnet funds are processed.

**This document is not legal, financial, tax, or investment advice.** A qualified tax attorney must review the final structure before any claim of deductibility on real funds.

---

## 1. Executive summary

Charitable giving still runs on trust that is hard to verify. Money moves first. Proof comes later — if at all.

**VeriChar** is infrastructure and software for charitable giving on the XRP Ledger. It is not a custodian, a wallet holder, or a co-signer. The goal is the **gold standard** — the BBB of giving: strict, transparent, cheap to use, easy to integrate, and designed for compliance without abandoning pure intent.

We built the code to eliminate unverifiable charity flows.  
Proof before payment. Encoded integrity.

The XRP Ledger makes this practical: deep liquidity, instant settlement, energy-efficient consensus, and fees of fractions of a penny on the dollar.

**Core rules (non-negotiable)**

- Proof comes **before** payment.
- Dual verification required: **itemized merchant invoice** (or vendor order and delivery data) and **proof of delivery**.
- Funds release **directly to the vendor**.
- The charity does **not** receive, hold, or spend the funds.
- VeriChar does **not** hold funds, private keys, release keys, or fulfillments, and does **not** co-sign.
- Nobody holds the funds. The ledger locks them until proof is met or the escrow expires.
- Every settlement step is recorded on a **public ledger**.
- No opacity. No ambiguity. No unverifiable release.

**Architecture direction (v0.9)**

A donor chooses a specific need listed by a verified 501(c)(3) — cases of water, cat food for a shelter, a program supply order from a named vendor (e.g., Walmart). From their own wallet, the donor creates a native XRPL **conditional escrow** payable to that vendor. The ledger itself locks the funds. There is no custodian.

A **double-oracle** path releases them. Two independent oracles, neither operated by VeriChar — for example, the vendor's digitized order and delivery data plus a carrier tracking feed — must both confirm that the need was fulfilled. When both confirm, EscrowFinish is submitted automatically and funds move to the vendor. If confirmation never arrives, the required `CancelAfter` date returns the funds to the donor.

The donor, the vendor, and the ledger are the only parties in the money path. VeriChar is the software that makes that path usable.

**Who pays nothing on core giving flows**

Donors, charities, and vendors pay **$0** in platform settlement fees. Network fees on the XRP Ledger remain fractions of a penny.

**How the platform is funded**

1. Donations to VeriChar itself (trackable as the system matures).  
2. Enterprise SaaS for audit-ready CSR / impact reporting and related tooling.

---

## 2. The problem

Four structural failures persist in conventional giving:

1. **Opacity** — donations pool into general funds; individual dollars are hard to trace.  
2. **Diversion risk** — money moves before evidence exists.  
3. **Burden of proof** — honest organizations still assemble evidence after the fact.  
4. **Trust gap** — donors must rely on reputation and reports instead of verifiable release conditions.

VeriChar inverts the sequence: lock first, prove, then release. Because nobody holds the funds in between, a charity cannot black-box the money, and VeriChar cannot either.

---

## 3. The VeriChar approach

### Intended flow

1. A verified 501(c)(3) lists a **specific, itemized organizational or program need**, with a named vendor and price — for example, cases of water or cat food for a shelter.  
2. The donor, from **their own wallet**, creates a native XRPL **conditional escrow** payable to that vendor, with a PREIMAGE-SHA-256 condition and a mandatory `CancelAfter` expiry.  
3. Two independent oracles, **neither operated by VeriChar**, confirm fulfillment: vendor order and delivery data, and proof of delivery (for example, carrier tracking).  
4. When both oracles confirm, **EscrowFinish** is submitted automatically and the ledger releases funds **directly to the vendor**.  
5. If both proofs never arrive, `CancelAfter` returns the funds to the donor. The donor never has to trust VeriChar or the charity to send them back.

### Nobody holds the funds

- The XRP Ledger replaces a third-party escrow holder. Funds are locked by the ledger itself.  
- VeriChar never holds the funds, never holds private keys or release keys, never holds the escrow fulfillment, and never co-signs any account.  
- The charity never takes intermediate custody of spendable cash.  
- On a conditional escrow, anyone can submit EscrowFinish, but only by supplying the correct fulfillment. In this design, that release is triggered by independent oracle confirmation of delivery, not by VeriChar.  
- `CancelAfter` is required for conditional escrows on the XRP Ledger. It is the backstop when delivery is never confirmed.

This is the structural change in v0.9. It keeps pure intent and makes the “we are just infrastructure” position match the actual control model.

### Building blocks

**Verified charities** — EIN (or equivalent) check + identity binding. Listed organizations are verified 501(c)(3)s.  
**Itemized needs** — specific goods or services with a named vendor and price, framed as organizational or program needs.  
**Conditional escrow** — PREIMAGE-SHA-256 (the only supported crypto-condition type on XRPL), created by the donor, with mandatory expiry (`CancelAfter`).  
**Double-oracle proofs** — two independent oracles, neither operated by VeriChar; both required.  
**Direct vendor settlement** — charity does not take intermediate custody of spendable cash.  
**Infrastructure only** — VeriChar is software. It does not stand in the money path.

---

## 4. System architecture

### Ledger layer (XRPL)

- Native **EscrowCreate / EscrowFinish / EscrowCancel**.  
- Conditional escrows with PREIMAGE-SHA-256 crypto-conditions.  
- Public, validated ledger records for every material step.  
- Instant settlement, native escrow (no custom custody contract), energy-efficient consensus, and fees of fractions of a penny.

Key references (xrpl.org):
- Escrow concepts and conditional escrow tutorials  
- EscrowCreate / EscrowFinish / EscrowCancel transaction references  
- TokenEscrow (enabled 12 February 2026)  
- Future Smart Escrows (XLS-0100) noted but not assumed

### Control model

1. The donor, from their own wallet, submits EscrowCreate for a specific listed need, with the vendor as destination and a mandatory `CancelAfter`.  
2. The ledger locks the funds. No party — not VeriChar, not the charity, not the vendor — can spend them until the condition is met or the escrow expires.  
3. Two independent oracles, neither operated by VeriChar, attest to invoice or order match and to delivery.  
4. Only if both attestations pass is EscrowFinish submitted, with the correct fulfillment, so funds move to the vendor. VeriChar cannot finish or cancel the escrow.  
5. If the oracles disagree, or if confirmation never arrives, funds are not released. After `CancelAfter`, they return to the donor.

### Reserves and fees

Each open escrow counts as one object toward the **sender’s** owner reserve. The donor, as sender, bears this reserve for every open escrow until it is finished or canceled. On Mainnet the current figures are approximately 1 XRP base reserve + 0.2 XRP per owned object (subject to fee voting).

EscrowFinish costs at least 330 drops plus 10 drops per 16 bytes of fulfillment and condition data. These network costs, plus the owner reserve, set a practical **minimum gift size**. Fees remain fractions of a penny; the reserve, not the transaction fee, is what matters for small gifts.

### Verification layer

Application-level dual-check (itemized invoice or vendor order data + delivery evidence), performed by two independent oracles that VeriChar does not operate. Only then is EscrowFinish triggered. The public product remains a simulation; the escrow flow has passed Testnet.

### Application layer

Donor experience, charity need-listing portal, and enterprise CSR tooling. VeriChar’s software can display status, package evidence, and help a donor construct the escrow transaction. It cannot sign, release, or cancel on anyone’s behalf. The public site remains a simulation until productized settlement is ready.

### Token / RLUSD path

**TokenEscrow** was enabled on 12 February 2026. Issued tokens such as RLUSD can be escrowed when the issuer permits — for trust-line tokens, Allow Trust Line Locking; for MPTs, Can Escrow and Can Transfer. Optional RLUSD (or similar) escrows are intended to avoid XRP price volatility on the gift amount, while still settling on the same ledger with the same release rules.

---

## 5. Business model

**Free for the giving network** — donors, charities, vendors: no platform settlement take-rate.

**Revenue**
- Donations to VeriChar (platform support, trackable over time).  
- Enterprise SaaS (audit-ready reporting, compliance workflows, exports). Not legal or tax advice; VeriChar does not file returns.

**Rejected**
- Default percentage fees on vendor payouts.  
- Opaque pooling of donor funds inside VeriChar.  
- Any design in which VeriChar holds funds, keys, or fulfillments.

---

## 6. Compliance & Responsible Design

These are **design commitments**, not legal conclusions. This section is not legal, tax, or regulatory advice. Counsel should review the live structure before Mainnet use.

- **Non-custodial / no control.** VeriChar is designed so that users retain control of their own wallets and VeriChar cannot move, freeze, or release funds. The intended posture is a software provider whose users keep total independent control of the value, consistent with the approach described in FinCEN FIN-2019-G001, and a software-only role under Illinois DACPA (205 ILCS 731) when the provider does not control transactions. Whether a regulator agrees depends on the implemented control model, which this version is written to match.
- **Qualified charities.** Listed organizations are designed to be verified 501(c)(3) entities registered with applicable state charity regulators.
- **Donor acknowledgments.** The charity, not VeriChar, issues donor acknowledgments. Because an unfulfilled escrow can return to the donor at `CancelAfter`, acknowledgments should reflect a completed fulfillment, not merely the opening of an escrow.
- **Program needs, not personal earmarks.** Needs are listed as organizational or program needs (for example, cat food for a shelter, cases of water for a relief program). The design avoids earmarking gifts to named individuals, which can affect deductibility.
- **Sanctions screening.** The design includes OFAC screening of relevant wallets — donors, charities, and vendors — against U.S. sanctions lists.
- **Oracle disagreement and disputes.** If the two oracles disagree, or if delivery is disputed (for example, a “delivered” scan on goods that did not arrive, or a return after delivery), funds are not released. The escrow remains locked until both oracles confirm, or until `CancelAfter` returns the funds to the donor. A documented dispute path is part of the design.
- **Minimum gift size.** Owner reserve and EscrowFinish costs make very small gifts impractical. The design will set a minimum gift size based on measured XRPL costs rather than process gifts that cannot settle efficiently.

Illinois registration and other jurisdictional requirements remain in scope as the project moves toward productized settlement.

---

## 7. Security and risk

- The fulfillment is the control point on a conditional escrow: anyone who has it can finish the escrow. VeriChar must not hold it. Independent oracles, and the rule that both must confirm, are the release path.
- Oracle independence and integrity are operational responsibilities. A compromised or conflicted oracle is a material risk; that is why neither oracle is operated by VeriChar and why both must agree.
- Escrows must carry `CancelAfter` to avoid permanent lock and to return unfulfilled gifts to the donor.
- Cryptographic and ledger records prove authenticity of records; they do not by themselves prove real-world honesty. The system makes misuse harder and more visible. Proof of delivery is not, by itself, proof of later use, which is why gifts are tied to a specific listed need and paid to the vendor rather than to the charity.

---

## 8. Roadmap (high level)

1. **Done:** native conditional escrow flow on XRP Ledger Testnet.
2. First vendor integration (for example, a retailer whose order and delivery data is already digitized) plus a second, independent delivery oracle such as a carrier tracking feed.
3. Oracle disagreement, returns, and dispute handling in the release path.
4. Exportable audit packages suitable for substantiation.
5. Legal, tax, and regulatory review of the completed non-custodial design.
6. Controlled productization beyond simulation.
7. Enterprise tooling expansion.

---

## 9. Conclusion

VeriChar exists to answer one question with evidence: **where did the money go?**

The answer is proof before payment on the XRP Ledger: itemized needs, a donor-created conditional escrow that nobody holds, independent dual-oracle verification, and direct vendor settlement. Instant, cheap, and energy-efficient, because the ledger already works that way.

The pure intent remains. The structure in this version is the practical path toward making that intent the gold standard others can integrate and trust — infrastructure, not a middleman.

No opacity. No ambiguity. No unverifiable release.

---

## Appendix — Open design questions

- Exact oracle operators, attestation format, and the mechanism that triggers EscrowFinish without VeriChar holding the fulfillment.
- Dispute, return, and false-delivery procedures in production.
- RLUSD (and other issued-token) escrow configuration, including issuer flags and pre-authorization, now that TokenEscrow is enabled.
- Minimum gift size after measured XRPL costs (including owner reserves).
- Final tax-counsel-approved acknowledgment and documentation package, including when a gift is treated as complete.
- Vendor API or partnership terms for the first digitized retailer integration (no vendor relationship is claimed in this draft).

---

*Version 0.9 (Draft) · 21 November 2026 · verichar.net*
