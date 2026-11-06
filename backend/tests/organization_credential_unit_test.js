'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { convertStringToHex } = require('xrpl');
const {
  verifyOrganizationCredential,
  LSF_ACCEPTED,
} = require('../src/organizationCredential');

const subjectAddress = 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59';
const issuerAddress = 'ra5nK24KXen9AHvsdFTKHSANinZseWnPcX';
const credentialType = convertStringToHex('VERICHAR_ORGANIZATION_REVIEW_V1').toUpperCase();

test('credential expiry is compared with the validated ledger close time', async () => {
  const requests = [];
  const client = {
    async request(request) {
      requests.push(request);
      if (request.command === 'ledger_entry') {
        return {
          result: {
            node: {
              Flags: LSF_ACCEPTED,
              Expiration: 800_000_000,
            },
          },
        };
      }
      if (request.command === 'ledger') {
        return { result: { ledger: { close_time: 800_000_001 } } };
      }
      throw new Error(`Unexpected request: ${request.command}`);
    },
  };

  const result = await verifyOrganizationCredential(
    client,
    subjectAddress,
    issuerAddress
  );

  assert.equal(result.valid, false);
  assert.deepEqual(requests, [
    {
      command: 'ledger_entry',
      credential: {
        subject: subjectAddress,
        issuer: issuerAddress,
        credential_type: credentialType,
      },
      ledger_index: 'validated',
    },
    { command: 'ledger', ledger_index: 'validated' },
  ]);
});

test('credential with a future expiration remains valid at the ledger close time', async () => {
  const client = {
    async request(request) {
      if (request.command === 'ledger_entry') {
        return {
          result: {
            node: {
              Flags: LSF_ACCEPTED,
              Expiration: 800_000_001,
            },
          },
        };
      }
      return { result: { ledger: { close_time: 800_000_000 } } };
    },
  };

  const result = await verifyOrganizationCredential(
    client,
    subjectAddress,
    issuerAddress
  );

  assert.equal(result.valid, true);
});
