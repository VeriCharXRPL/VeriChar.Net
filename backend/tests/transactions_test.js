'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getEngineResult, submitTransaction } = require('../src/transactions');

describe('XRPL transaction helpers', () => {
  it('reads engine results from XRPL metadata and response fallbacks', () => {
    assert.equal(
      getEngineResult({ meta: { TransactionResult: 'tesSUCCESS' } }),
      'tesSUCCESS'
    );
    assert.equal(getEngineResult({ engine_result: 'tecFAILED' }), 'tecFAILED');
    assert.equal(getEngineResult({ engineResult: 'tecFAILED' }), 'tecFAILED');
    assert.equal(getEngineResult({}), '');
  });

  it('submits with the wallet and returns the successful result', async () => {
    const wallet = { address: 'rTest' };
    const transaction = { TransactionType: 'Payment' };
    const result = { meta: { TransactionResult: 'tesSUCCESS' } };
    let submitted;
    const client = {
      submitAndWait: async (...args) => {
        submitted = args;
        return { result };
      },
    };

    assert.equal(
      await submitTransaction(client, transaction, wallet, 'Payment'),
      result
    );
    assert.deepEqual(submitted, [transaction, { wallet }]);
  });

  it('rejects transactions that do not succeed', async () => {
    const client = {
      submitAndWait: async () => ({
        result: { meta: { TransactionResult: 'tecFAILED' } },
      }),
    };

    await assert.rejects(
      submitTransaction(client, {}, {}, 'EscrowFinish'),
      /EscrowFinish failed: tecFAILED/
    );
  });
});
