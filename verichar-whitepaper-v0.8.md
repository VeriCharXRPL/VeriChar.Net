# VeriChar Whitepaper

**Verifiable giving on the XRP Ledger**  
*Proof before payment. The gold standard for charitable verification.*

**Brianne Salato**  
Founder and Product Architect

**Version 0.8 (Draft)** · 25 October 2026  
[verichar.net](https://verichar.net) · [VeriChar@proton.me](mailto:VeriChar@proton.me) · X: [@VeriCharOnChain](https://x.com/VeriCharOnChain)

---

## Document status

This is **Version 0.8**, a draft. It replaces Version 0.7 and incorporates the architecture direction adopted 25 October 2026.

**What changed from 0.7**

| Topic | v0.7 | v0.8 |
|---|---|---|
| Account model | Open / general escrow framing | **Dedicated XRPL account per verified 501(c)(3)** under controlled multi-signature rules |
| Positioning | Verification layer | **Gold standard (BBB of giving)** — easily integrated, cheap, efficient, compliant, pure intent preserved |
| Tax path | Limited discussion | Clearer path toward completed gifts to qualified 501(c)(3)s while retaining dual-proof release |
| Control | Charity never holds cash (high level) | Explicit multi-sig + conditional escrow so charity cannot unilaterally bypass proof requirements |

VeriChar remains a **working prototype**. The public website and demonstration are **simulations**. No real donations or Mainnet funds are processed. Backend escrow helpers continue to pass live **XRP Ledger Testnet** CI.

**This document is not legal, financial, tax, or investment advice.** A qualified tax attorney must review the final structure before any claim of deductibility on real funds.

---

## 1. Executive summary

Charitable giving still runs on trust that is hard to verify. Money moves first. Proof comes later — if at all.

**VeriChar** is the verification and settlement standard for charitable giving on the XRP Ledger. The goal is to become the **gold standard** — the BBB of giving: strict, transparent, cheap to use, easy to integrate, and designed for compliance without abandoning pure intent.

**Core rules (non-negotiable)**

- Proof comes **before** payment.
- Dual verification required: **itemized merchant invoice** and **proof of delivery**.
- Funds release **directly to the vendor**.
- The charity does **not** freely control or spend the funds.
- Every settlement step is recorded on a **public ledger**.

**Architecture direction (v0.8)**

Each verified 501(c)(3) receives a **dedicated XRPL account**. Funds for that organization’s verified needs lock into conditional escrows on that account. Release requires the dual proofs. Multi-signature rules prevent the charity from unilaterally finishing or canceling escrows in a way that bypasses verification.

This structure improves the path toward treating contributions as completed gifts to a qualified organization while preserving the verification model that defines VeriChar.

**Who pays nothing on core giving flows**

Donors, charities, and vendors pay **$0** in platform settlement fees.

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

VeriChar inverts the sequence: lock first, prove, then release.

---

## 3. The VeriChar approach

### Intended flow

1. Donor funds a **specific, itemized need** linked to a verified 501(c)(3).  
2. Funds lock in a **conditional escrow** on that charity’s dedicated XRPL account, with the vendor as destination.  
3. Charity (or authorized party) submits **itemized invoice** and **proof of delivery**.  
4. Verification service checks both proofs.  
5. Only if both pass does the escrow finish and funds move to the vendor. Otherwise funds can return after expiry.

### Dedicated account per verified 501(c)(3)

- Each verified organization is bound to its own XRPL account.  
- A SignerList is configured so release authority is shared and constrained.  
- The charity cannot freely withdraw or finish escrows without satisfying the dual-proof path.  
- All escrow create / finish / cancel activity remains public on the ledger.

This is the structural change introduced in v0.8. It keeps pure intent while improving ownership clarity for compliance discussions.

### Building blocks

**Verified charities** — EIN (or equivalent) check + identity binding + dedicated account.  
**Itemized needs** — specific goods/services with named vendor and price.  
**Conditional escrow** — PREIMAGE-SHA-256 (or successor) conditions; mandatory expiry.  
**Dual proofs** — invoice match + delivery evidence; both required.  
**Direct vendor settlement** — charity does not take intermediate custody of spendable cash.

---

## 4. System architecture

### Ledger layer (XRPL)

- Native **EscrowCreate / EscrowFinish / EscrowCancel**.  
- Conditional escrows with crypto-conditions.  
- **Multi-signing** (SignerListSet) on each charity’s dedicated account.  
- Public, validated ledger records for every material step.

Key references (xrpl.org):
- Multi-Signing  
- Escrow concepts and conditional escrow tutorials  
- EscrowCreate / EscrowFinish transaction references  
- Future Smart Escrows (XLS-0100) noted but not assumed

### Control model

1. Dedicated account created and linked to the verified 501(c)(3).  
2. SignerList set with quorum/weights that prevent unilateral bypass of proof requirements.  
3. EscrowCreate locks funds for a specific need with vendor destination and CancelAfter.  
4. EscrowFinish occurs only after dual proofs are accepted and the correct fulfillment is supplied.  
5. Failed or expired paths return funds per escrow rules.

### Verification layer

Application-level dual-check (invoice + delivery). Only then is the fulfillment used. Current public product still uses stubs; Testnet helpers exist.

### Application layer

Donor experience, charity portal, enterprise CSR tooling. Public site remains simulation until productized settlement is ready.

---

## 5. Business model

**Free for the giving network** — donors, charities, vendors: no platform settlement take-rate.

**Revenue**
- Donations to VeriChar (platform support, trackable over time).  
- Enterprise SaaS (audit-ready reporting, compliance workflows, exports). Not legal or tax advice; VeriChar does not file returns.

**Rejected**
- Default percentage fees on vendor payouts.  
- Opaque pooling of donor funds inside VeriChar.

---

## 6. Compliance considerations

The dedicated-account model is designed to improve the chance that contributions can be treated as completed gifts to a qualified 501(c)(3). Documentation packages (on-chain IDs, invoice, delivery proof, charity verification record, acknowledgments) are intended to support substantiation.

**This is not tax advice.** Final structure, acknowledgment language, and operational controls require review by qualified tax counsel before any Mainnet deployment that asserts deductibility.

Illinois registration and other jurisdictional requirements remain in scope as previously noted in the project.

---

## 7. Security and risk

- Fulfillment custody must be guarded.  
- Multi-sig recovery and key management are operational responsibilities.  
- Escrows must carry expiry to avoid permanent lock.  
- Cryptographic and ledger records prove authenticity of records; they do not by themselves prove real-world honesty. The system makes misuse harder and more visible.

---

## 8. Roadmap (high level)

1. Prototype dedicated account creation + SignerListSet on Testnet.  
2. Define quorum, recovery, and oracle participation in the release path.  
3. Exportable audit packages suitable for substantiation.  
4. Legal / tax review of the completed design.  
5. Controlled productization beyond simulation.  
6. Enterprise tooling expansion.

---

## 9. Conclusion

VeriChar exists to answer one question with evidence: **where did the money go?**

The answer is proof before payment on the XRP Ledger: itemized needs, dedicated controlled accounts for verified 501(c)(3)s, conditional escrow, dual verification, and direct vendor settlement.

The pure intent remains. The structure in this version is the practical path toward making that intent the gold standard others can integrate and trust.

---

## Appendix — Open design questions

- Exact SignerList quorum and recovery procedures.  
- RLUSD escrow feasibility and configuration on Testnet.  
- Oracle operational model and fulfillment custody.  
- Minimum gift size after measured XRPL costs.  
- Final tax-counsel-approved acknowledgment and documentation package.

---

*Version 0.8 (Draft) · 25 October 2026 · verichar.net*
