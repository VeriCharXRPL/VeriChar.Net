'use strict';

const { createHash } = require('node:crypto');
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createApiServer } = require('../src/api');

const tokens = {
  tenantA: 'test-token-tenant-A-0123456789abcdef',
  tenantB: 'test-token-tenant-B-0123456789abcdef',
};

function tokenRecord(token, tenantId, scopes) {
  return {
    keyHash: createHash('sha256').update(token).digest('hex'),
    tenantId,
    scopes,
  };
}

describe('tenant-aware API', () => {
  let server;
  let baseUrl;
  let ledgerRequests;
  let disconnects;

  before(async () => {
    ledgerRequests = [];
    disconnects = 0;
    server = createApiServer({
      corsOrigins: ['https://verichar.net'],
      tokenRecords: [
        tokenRecord(tokens.tenantA, 'tenant-a', ['tenant:read', 'ledger:read']),
        tokenRecord(tokens.tenantB, 'tenant-b', ['tenant:read']),
      ],
      openTestnetClient: async () => ({
        request: async (request) => {
          ledgerRequests.push(request);
          return {
            result: {
              account_data: { Account: request.account, Balance: '100' },
              ledger_index: 123,
            },
          };
        },
        isConnected: () => true,
        disconnect: async () => {
          disconnects += 1;
        },
      }),
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('serves a public health check', async () => {
    const response = await fetch(`${baseUrl}/healthz`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });

  it('allows the configured frontend to read health status only', async () => {
    const response = await fetch(`${baseUrl}/healthz`, {
      headers: { origin: 'https://verichar.net' },
    });
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://verichar.net');
    assert.equal(response.headers.get('vary'), 'Origin');

    const blocked = await fetch(`${baseUrl}/healthz`, {
      headers: { origin: 'https://untrusted.example' },
    });
    assert.equal(blocked.headers.get('access-control-allow-origin'), null);
  });

  it('rejects unauthenticated tenant requests', async () => {
    const response = await fetch(`${baseUrl}/v1/tenant`);
    assert.equal(response.status, 401);
  });

  it('binds tenant context to the authenticated token', async () => {
    const response = await fetch(`${baseUrl}/v1/tenant`, {
      headers: {
        authorization: `Bearer ${tokens.tenantA}`,
        'x-tenant-id': 'tenant-b',
      },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      tenantId: 'tenant-a',
      scopes: ['tenant:read', 'ledger:read'],
    });
  });

  it('enforces token scopes before reading the public Testnet ledger', async () => {
    const response = await fetch(
      `${baseUrl}/v1/networks/testnet/accounts/r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59`,
      { headers: { authorization: `Bearer ${tokens.tenantB}` } }
    );
    assert.equal(response.status, 403);
    assert.equal(ledgerRequests.length, 0);
  });

  it('reads validated account information from Testnet only', async () => {
    const response = await fetch(
      `${baseUrl}/v1/networks/testnet/accounts/r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59`,
      { headers: { authorization: `Bearer ${tokens.tenantA}` } }
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      network: 'testnet',
      account: {
        Account: 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59',
        Balance: '100',
      },
      validatedLedger: 123,
    });
    assert.equal(ledgerRequests[0].command, 'account_info');
    assert.equal(ledgerRequests[0].ledger_index, 'validated');
    assert.equal(disconnects, 1);
  });

  it('keeps Mainnet unavailable even for an authenticated tenant', async () => {
    const response = await fetch(
      `${baseUrl}/v1/networks/mainnet/accounts/r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59`,
      { headers: { authorization: `Bearer ${tokens.tenantA}` } }
    );
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'network_unavailable' });
    assert.equal(ledgerRequests.length, 1);
  });

  it('rejects invalid account addresses without contacting XRPL', async () => {
    const response = await fetch(
      `${baseUrl}/v1/networks/testnet/accounts/not-an-xrpl-address`,
      { headers: { authorization: `Bearer ${tokens.tenantA}` } }
    );
    assert.equal(response.status, 400);
    assert.equal(ledgerRequests.length, 1);
  });

  it('rejects unsupported methods', async () => {
    const response = await fetch(`${baseUrl}/v1/tenant`, { method: 'POST' });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET');
  });

  it('keeps donation, verification, receipt, and ledger-write doors closed', async () => {
    const before = ledgerRequests.length;
    const doors = [
      ['/v1/donations', 'acceptDonation'],
      ['/v1/charities/example-charity/verify', 'markCharityVerified'],
      ['/v1/receipts', 'issueTaxReceipt'],
      ['/v1/networks/mainnet/transactions', 'submitLedgerTransaction'],
      ['/v1/networks/testnet/transactions', 'submitLedgerTransaction'],
    ];

    for (const [path, action] of doors) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${tokens.tenantA}` },
      });
      assert.equal(response.status, 403);
      assert.deepEqual(await response.json(), { error: 'compliance_closed', action });
    }

    assert.equal(ledgerRequests.length, before);
  });
});
