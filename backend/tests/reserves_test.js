'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connectClient, fundWallet, xrpl } = require('../src/client');
const {
  fundReserves,
  getNetworkReserves,
  getAccountReserveInfo,
  checkReserveRequirement,
} = require('../src/reserves');
const { vericharMemo } = require('../src/memo');

describe('fundReserves', () => {
  it('rejects numeric amounts that may have lost precision', async () => {
    await assert.rejects(
      fundReserves(
        null,
        { address: 'rSource' },
        'rDestination',
        1000
      ),
      /amountDrops must be a positive integer string/
    );
  });

  it('attaches a VeriChar memo to the payment', async () => {
    const sourceWallet = { address: 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59' };
    let submitted;
    const client = {
      submitAndWait: async (transaction, options) => {
        submitted = transaction;
        assert.equal(options.wallet, sourceWallet);
        return { result: { meta: { TransactionResult: 'tesSUCCESS' } } };
      },
    };

    await fundReserves(
      client,
      sourceWallet,
      'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59',
      '1000'
    );

    xrpl.validate(submitted);
    assert.deepEqual(submitted.Memos, vericharMemo());
  });
});

describe('getNetworkReserves', () => {
  it('requests current validated-ledger reserve data', async () => {
    let request;
    const reserves = await getNetworkReserves({
      request: async (params) => {
        request = params;
        return {
          result: {
            state: {
              validated_ledger: {
                reserve_base: 10000000,
                reserve_inc: 2000000,
              },
            },
          },
        };
      },
    });

    assert.deepEqual(request, {
      command: 'server_state',
      ledger_index: 'current',
    });
    assert.deepEqual(reserves, {
      baseReserveDrops: '10000000',
      ownerReserveDrops: '2000000',
    });
  });
});

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
