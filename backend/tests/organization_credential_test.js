'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runOrganizationCredentialFlow } = require('../src/organizationCredential');

/**
 * End-to-end Testnet validation of the organization-review credential stack.
 * Requires network access to the XRPL Testnet faucet and WSS.
 */
test('organization-review credential flow succeeds on Testnet', async () => {
  const result = await runOrganizationCredentialFlow();

  assert.equal(result.createResult, 'tesSUCCESS');
  assert.equal(result.acceptResult, 'tesSUCCESS');
  assert.equal(result.domainResult, 'tesSUCCESS');
  assert.equal(result.valid, true);
  assert.ok(result.domainID);
  assert.ok(result.issuer);
  assert.ok(result.subject);
  assert.equal(result.credentialType, 'VERICHAR_ORGANIZATION_REVIEW_V1');
});
