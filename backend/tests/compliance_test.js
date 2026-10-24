'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  CLOSED,
  ComplianceClosed,
  assertMayAcceptDonation,
  assertMayMarkCharityVerified,
  assertMayIssueTaxReceipt,
  assertMaySubmitLedgerTransaction,
  assertMainnetClosed,
} = require('../src/compliance');

describe('compliance gates', () => {
  it('keeps every product door closed in source', () => {
    assert.deepEqual(CLOSED, {
      acceptDonation: false,
      markCharityVerified: false,
      issueTaxReceipt: false,
      submitLedgerTransaction: false,
      mainnet: false,
    });
  });

  it('refuses donations, verification, tax receipts, ledger writes, and Mainnet', () => {
    const doors = [
      ['acceptDonation', assertMayAcceptDonation],
      ['markCharityVerified', assertMayMarkCharityVerified],
      ['issueTaxReceipt', assertMayIssueTaxReceipt],
      ['submitLedgerTransaction', assertMaySubmitLedgerTransaction],
      ['mainnet', assertMainnetClosed],
    ];

    for (const [action, assertClosed] of doors) {
      assert.throws(assertClosed, (error) => {
        assert.ok(error instanceof ComplianceClosed);
        assert.equal(error.code, 'compliance_closed');
        assert.equal(error.action, action);
        return true;
      });
    }
  });
});
