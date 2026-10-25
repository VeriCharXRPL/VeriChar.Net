# VeriChar Architecture Direction

**Status:** Draft design direction (October 2026)  
**Goal:** Become the gold standard verification layer for charitable giving (the BBB of giving) while remaining pure, compliant, cheap, and easy to integrate.

## Core Intent (non-negotiable)

- Proof comes **before** payment.
- Dual verification required: itemized merchant invoice **and** proof of delivery.
- Funds release directly to the vendor.
- Charity does not freely control or spend the funds.
- Full transparency on the XRP Ledger.

## Recommended Structure: Dedicated Account per Verified 501(c)(3)

Each verified charity receives its own dedicated XRPL account. This account is the legal and on-ledger home for funds intended for that organization’s verified needs.

### Why this structure

- Improves the path toward treating contributions as completed gifts to a qualified 501(c)(3).
- Still allows strict on-ledger controls so the charity cannot simply withdraw funds at will.
- Keeps every settlement step public and auditable.
- Aligns with native XRPL features documented at xrpl.org.

### Control model (aligned with xrpl.org)

We use **multi-signing** (see [Multi-Signing](https://xrpl.org/docs/concepts/accounts/multi-signing)) combined with **conditional escrow** (see [Escrow](https://xrpl.org/docs/concepts/payment-types/escrow)).

Typical configuration:

1. A dedicated XRPL account is created and linked to the verified 501(c)(3).
2. A SignerList is set on that account (SignerListSet transaction).
3. Quorum and weights are designed so that:
   - The charity cannot unilaterally finish or cancel escrows in a way that bypasses proof requirements.
   - VeriChar (or an oracle process) participates in the release path only after dual proofs are verified.
4. Funds for a specific need are locked with EscrowCreate using a crypto-condition (PREIMAGE-SHA-256) and appropriate CancelAfter.
5. EscrowFinish is only possible when the correct fulfillment is supplied after invoice + proof of delivery have been checked.

This follows official XRPL patterns for shared custody and conditional release.

### Key XRPL references used

- Multi-Signing: https://xrpl.org/docs/concepts/accounts/multi-signing
- Set Up Multi-Signing tutorial: https://xrpl.org/docs/tutorials/best-practices/key-management/set-up-multi-signing
- Escrow concepts: https://xrpl.org/docs/concepts/payment-types/escrow
- Conditional Escrow tutorial: https://xrpl.org/docs/tutorials/payments/send-a-conditional-escrow
- EscrowCreate reference: https://xrpl.org/docs/references/protocol/transactions/types/escrowcreate
- Smart Escrows (future programmability): XLS-0100

### What stays the same

- Dual proof requirement (invoice + delivery) remains mandatory.
- Public ledger records every step.
- Free for donors, charities, and vendors on core giving flows.
- Enterprise layer for CSR/audit tooling remains separate.

### What changes

- Move from purely open/anonymous escrow toward per-charity dedicated accounts under controlled multi-signature rules.
- Clearer ownership path for tax and compliance discussions.
- Slightly higher operational complexity (key management, signer lists, account lifecycle).

## Tax & Compliance Note

This architecture is designed to improve the chance that contributions can be treated as gifts to a qualified 501(c)(3). It does **not** constitute legal or tax advice. A qualified tax attorney must review the final structure, acknowledgment process, and documentation package before any real-money or Mainnet deployment that claims deductibility.

## Implementation Status

- Current repo: Testnet escrow helpers and simulation only.
- This document describes the target architecture direction.
- White paper should be updated to v0.8 once this direction is accepted and detailed control flows are finalized.

## Next engineering steps

1. Prototype dedicated account creation + SignerListSet on Testnet.
2. Define exact quorum/weight policy and recovery procedures.
3. Map oracle / proof-verification service into the multi-sign release path.
4. Generate exportable audit packages (on-chain IDs + invoice + delivery proof) suitable for substantiation.
5. Legal review of the completed design.
