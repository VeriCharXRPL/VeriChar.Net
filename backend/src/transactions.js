'use strict';

function getEngineResult(transactionResult) {
  const meta = transactionResult.meta || transactionResult.metaData || {};
  return meta.TransactionResult
    || transactionResult.engine_result
    || transactionResult.engineResult
    || '';
}

async function submitTransaction(client, transaction, wallet, operation) {
  const { result } = await client.submitAndWait(transaction, { wallet });
  const engineResult = getEngineResult(result);

  if (engineResult !== 'tesSUCCESS') {
    throw new Error(`${operation} failed: ${engineResult}`);
  }

  return result;
}

module.exports = {
  getEngineResult,
  submitTransaction,
};
