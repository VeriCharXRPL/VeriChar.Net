'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runEinCredentialFlow } = require('../src/einCredential');

/**
 * End-to-end Testnet validation of the public EIN credential stack.
 * Requires network access to the XRPL Testnet faucet and WSS.
 */
test('public EIN credential full flow succeeds on Testnet', async (t) => {
  const result = await runEinCredentialFlow('EIN-12-3456789');

  assert.equal(result.createResult, 'tesSUCCESS');
  assert.equal(result.acceptResult, 'tesSUCCESS');
  assert.equal(result.domainResult, 'tesSUCCESS');
  assert.equal(result.valid, true);
  assert.ok(result.domainID);
  assert.ok(result.issuer);
  assert.ok(result.subject);
  assert.equal(result.ein, 'EIN-12-3456789');
});
