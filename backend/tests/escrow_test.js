'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connectClient, fundWallet, xrpl } = require('../src/client');
const {
  createConditionalEscrow,
  finishEscrow,
  cancelEscrow,
  escrowFinishFeeDrops,
} = require('../src/escrow');
const { validateFulfillment } = require('../src/condition');
const {
  extractDeliveredAmount,
  vendorBalanceDeltaFromEscrowFinish,
} = require('../src/monitor');

describe('escrowFinishFeeDrops', () => {
  it('matches xrpl.org formula: 330 + 10 * floor(bytes/16)', () => {
    // 32 hex chars = 16 bytes → 330 + 10*1 = 340
    assert.equal(escrowFinishFeeDrops('A'.repeat(32)), '340');
    // 64 hex chars = 32 bytes → 330 + 10*2 = 350
    assert.equal(escrowFinishFeeDrops('A'.repeat(64)), '350');
  });
});

describe('createConditionalEscrow validation', () => {
  it('rejects amountDrops of "0"', async () => {
    await assert.rejects(
      async () =>
        createConditionalEscrow(null, { address: 'rDummy' }, {
          destination: 'rVendor',
          amountDrops: '0',
          cancelAfterSeconds: 60,
        }),
      /amountDrops/
    );
  });
});

describe('escrow (testnet)', () => {
  let client;
  let sender;
  let vendor;
  let finisher;

  before(async () => {
    client = await connectClient();
    sender = (await fundWallet(client)).wallet;
    vendor = (await fundWallet(client)).wallet;
    finisher = (await fundWallet(client)).wallet;
  });

  after(async () => {
    if (client && client.isConnected()) {
      await client.disconnect();
    }
  });

  it('CancelAfter is Ripple epoch (not Unix)', async () => {
    const before = Math.floor(Date.now() / 1000);
    const created = await createConditionalEscrow(client, sender, {
      destination: vendor.address,
      amountDrops: '10000',
      cancelAfterSeconds: 120,
    });
    // Ripple epoch starts 2000-01-01; value must be far below Unix now
    assert.ok(created.cancelAfter < before);
    // Round-trip through xrpl helpers
    const iso = xrpl.rippleTimeToISOTime(created.cancelAfter);
    const back = xrpl.isoTimeToRippleTime(iso);
    assert.equal(back, created.cancelAfter);
  });

  it('creates conditional escrow, finishes with explicit fee; vendor balance rises', async () => {
    const amountDrops = '100000'; // 0.1 XRP

    const created = await createConditionalEscrow(client, sender, {
      destination: vendor.address,
      amountDrops,
      cancelAfterSeconds: 600,
    });

    assert.ok(created.sequence > 0);
    assert.ok(validateFulfillment(created.fulfillment, created.condition));

    const minFee = escrowFinishFeeDrops(created.fulfillment);
    assert.ok(BigInt(minFee) >= 330n);

    const finished = await finishEscrow(client, finisher, {
      owner: sender.address,
      offerSequence: created.sequence,
      condition: created.condition,
      fulfillment: created.fulfillment,
    });

    const { engineResult } = extractDeliveredAmount(finished);
    assert.equal(engineResult, 'tesSUCCESS');

    // Fee on submitted tx should be at least the formula minimum
    const feeUsed = finished.tx_json?.Fee || finished.Fee;
    if (feeUsed != null) {
      assert.ok(BigInt(feeUsed) >= BigInt(minFee));
    }

    // Confirm vendor received funds via balance changes
    const delta = vendorBalanceDeltaFromEscrowFinish(
      { ...finished, validated: true },
      vendor.address
    );
    assert.equal(delta.engineResult, 'tesSUCCESS');
    // UNVERIFIED path becomes verified if this assertion holds on testnet
    assert.equal(delta.xrpDeltaDrops, amountDrops);
  });

  it('cancels after CancelAfter expires', async () => {
    const amountDrops = '50000';

    const created = await createConditionalEscrow(client, sender, {
      destination: vendor.address,
      amountDrops,
      cancelAfterSeconds: 5,
    });

    // Wait past CancelAfter (ledger close time can lag ~5s)
    await new Promise((r) => setTimeout(r, 20000));

    const canceled = await cancelEscrow(client, finisher, {
      owner: sender.address,
      offerSequence: created.sequence,
    });

    const { engineResult } = extractDeliveredAmount(canceled);
    assert.equal(engineResult, 'tesSUCCESS');
  });
});
