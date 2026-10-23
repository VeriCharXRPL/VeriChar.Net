'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  extractDeliveredAmount,
  isSuccessfulValidated,
  watchAccount,
} = require('../src/monitor');

describe('monitor', () => {
  it('reads delivered_amount and ignores Amount for success', () => {
    const tx = {
      validated: true,
      meta: {
        TransactionResult: 'tesSUCCESS',
        delivered_amount: '1000000',
      },
      Amount: '999999999', // should be ignored
    };
    const { delivered, engineResult, validated } = extractDeliveredAmount(tx);
    assert.equal(delivered, '1000000');
    assert.equal(engineResult, 'tesSUCCESS');
    assert.equal(validated, true);
    assert.equal(isSuccessfulValidated(tx), true);
  });

  it('returns null delivered when not tesSUCCESS', () => {
    const tx = {
      validated: true,
      meta: {
        TransactionResult: 'tecUNFUNDED',
        delivered_amount: '1000000',
      },
    };
    const { delivered, engineResult } = extractDeliveredAmount(tx);
    assert.equal(delivered, null);
    assert.equal(engineResult, 'tecUNFUNDED');
    assert.equal(isSuccessfulValidated(tx), false);
  });

  it('handles missing delivered_amount', () => {
    const tx = {
      validated: true,
      meta: { TransactionResult: 'tesSUCCESS' },
    };
    const { delivered, engineResult } = extractDeliveredAmount(tx);
    assert.equal(delivered, null);
    assert.equal(engineResult, 'tesSUCCESS');
  });

  it('rejects tesSUCCESS when validated is missing', () => {
    const tx = {
      meta: {
        TransactionResult: 'tesSUCCESS',
        delivered_amount: '1000000',
      },
    };
    const { validated, delivered } = extractDeliveredAmount(tx);
    assert.equal(validated, false);
    assert.equal(isSuccessfulValidated(tx), false);
    // delivered may still be parsed, but must not count as successful validated
    assert.equal(delivered, '1000000');
  });

  it('rejects tesSUCCESS when validated is false', () => {
    const tx = {
      validated: false,
      meta: {
        TransactionResult: 'tesSUCCESS',
        delivered_amount: '1000000',
      },
    };
    assert.equal(extractDeliveredAmount(tx).validated, false);
    assert.equal(isSuccessfulValidated(tx), false);
  });

  it('surfaces unsubscribe failures while the client is connected', async () => {
    const client = {
      isConnected: () => true,
      on() {},
      off() {},
      request: async ({ command }) => {
        if (command === 'unsubscribe') {
          throw new Error('unsubscribe failed');
        }
      },
    };
    const subscription = await watchAccount(client, 'rAccount', () => {});

    await assert.rejects(subscription.unsubscribe(), /unsubscribe failed/);
  });
});
