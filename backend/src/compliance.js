'use strict';

/**
 * Product gates. Closed in source.
 * Opening one is an edit to this file after counsel, not an environment variable.
 * A passing check is not a registration, a license, or legal advice.
 * Lab helpers used by Testnet CI are not product doors and do not call this module.
 */

const CLOSED = Object.freeze({
  acceptDonation: false,
  markCharityVerified: false,
  issueTaxReceipt: false,
  submitLedgerTransaction: false,
  mainnet: false,
});

class ComplianceClosed extends Error {
  constructor(action) {
    super(`COMPLIANCE: ${action} is closed.`);
    this.name = 'ComplianceClosed';
    this.code = 'compliance_closed';
    this.action = action;
  }
}

function assertClosed(action) {
  // Both branches throw. Setting a flag to true does not open the door.
  if (CLOSED[action] !== false) {
    throw new ComplianceClosed(action);
  }
  throw new ComplianceClosed(action);
}

function assertMayAcceptDonation() {
  assertClosed('acceptDonation');
}

function assertMayMarkCharityVerified() {
  assertClosed('markCharityVerified');
}

function assertMayIssueTaxReceipt() {
  assertClosed('issueTaxReceipt');
}

function assertMaySubmitLedgerTransaction() {
  assertClosed('submitLedgerTransaction');
}

function assertMainnetClosed() {
  assertClosed('mainnet');
}

module.exports = {
  CLOSED,
  ComplianceClosed,
  assertMayAcceptDonation,
  assertMayMarkCharityVerified,
  assertMayIssueTaxReceipt,
  assertMaySubmitLedgerTransaction,
  assertMainnetClosed,
};
