'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connectClient, fundWallet } = require('../src/client');
const {
  getNetworkReserves,
  getAccountReserveInfo,
  checkReserveRequirement,
} = require('../src/reserves');

describe('reserves (testnet)', () => {
  let client;
  let wallet;

  before(async () => {
    client = await connectClient();
    const funded = await fundWallet(client);
    wallet = funded.wallet;
  });

  after(async () => {
    if (client && client.isConnected()) {
      await client.disconnect();
    }
  });

  it('reads network base and owner reserves as digit strings', async () => {
    const r = await getNetworkReserves(client);
    assert.match(r.baseReserveDrops, /^\d+$/);
    assert.match(r.ownerReserveDrops, /^\d+$/);
    assert.ok(BigInt(r.baseReserveDrops) > 0n);
    assert.ok(BigInt(r.ownerReserveDrops) > 0n);
  });

  it('reads account_info OwnerCount and Balance', async () => {
    const info = await getAccountReserveInfo(client, wallet.address);
    assert.equal(typeof info.ownerCount, 'number');
    assert.match(info.balanceDrops, /^\d+$/);
  });

  it('checkReserveRequirement reports no shortfall for funded faucet wallet', async () => {
    const check = await checkReserveRequirement(client, wallet.address, 1);
    assert.match(check.requiredDrops, /^\d+$/);
    assert.equal(check.shortfallDrops, '0');
  });
});
