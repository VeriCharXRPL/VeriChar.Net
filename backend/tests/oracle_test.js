'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  verifyInvoice,
  verifyDeliveryProof,
  verifyBoth,
} = require('../src/oracle');

describe('oracle (stub)', () => {
  it('invoice stub fails without document', async () => {
    const r = await verifyInvoice({
      listedNeedId: 'need-1',
      listedItemDescription: 'water',
      listedAmountDrops: '1000000',
    });
    assert.equal(r.passed, false);
  });

  it('invoice stub fails even with document (not implemented)', async () => {
    const r = await verifyInvoice({
      listedNeedId: 'need-1',
      listedItemDescription: 'water',
      listedAmountDrops: '1000000',
      invoiceDocument: 'fake-invoice',
    });
    assert.equal(r.passed, false);
    assert.match(r.reason, /not implemented/i);
  });

  it('delivery stub fails without proof', async () => {
    const r = await verifyDeliveryProof({});
    assert.equal(r.passed, false);
  });

  it('verifyBoth requires both to pass', async () => {
    const r = await verifyBoth(
      {
        listedNeedId: 'need-1',
        listedAmountDrops: '1000000',
        invoiceDocument: 'x',
      },
      { photo: Buffer.from('x') }
    );
    assert.equal(r.bothPassed, false);
  });
});
