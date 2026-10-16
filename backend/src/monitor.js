'use strict';

/**
 * Ledger monitor.
 * Counts only validated transactions with tesSUCCESS.
 * Payment: use meta.delivered_amount — never Amount (partial payments).
 * EscrowFinish: use getBalanceChanges to confirm vendor received funds (confirmed on Altnet).
 */

const xrpl = require('xrpl');

/**
 * Extract delivered amount from a validated transaction result.
 * Prefer meta.delivered_amount; fall back only if missing and result is tesSUCCESS
 * for pure XRP payments without partial payment flag (still prefer delivered_amount).
 *
 * @param {object} txResult - result from submitAndWait or a validated ledger tx
 * @returns {{ delivered: string|object|null, engineResult: string, validated: boolean }}
 */
function extractDeliveredAmount(txResult) {
  const meta = txResult.meta || txResult.metaData || {};
  const engineResult =
    meta.TransactionResult
    || txResult.engine_result
    || txResult.engineResult
    || '';

  // validated only when the field is explicitly true
  const validated = txResult.validated === true;

  if (engineResult !== 'tesSUCCESS') {
    return { delivered: null, engineResult, validated };
  }

  // XRPL docs: use delivered_amount, not Amount
  let delivered = null;
  if (meta.delivered_amount !== undefined) {
    delivered = meta.delivered_amount;
  } else if (meta.DeliveredAmount !== undefined) {
    delivered = meta.DeliveredAmount;
  }

  return {
    delivered,
    engineResult,
    validated,
  };
}

/**
 * Return true only for validated tesSUCCESS results.
 * @param {object} txResult
 * @returns {boolean}
 */
function isSuccessfulValidated(txResult) {
  const { engineResult, validated } = extractDeliveredAmount(txResult);
  return validated && engineResult === 'tesSUCCESS';
}

/**
 * Subscribe to validated transactions for an account (WebSocket).
 * Invokes onTx only for tesSUCCESS + validated.
 *
 * @param {import('xrpl').Client} client
 * @param {string} account
 * @param {(tx: object, delivered: string|object|null) => void} onTx
 * @returns {Promise<{ unsubscribe: () => Promise<void> }>}
 */
async function watchAccount(client, account, onTx) {
  if (!account || typeof onTx !== 'function') {
    throw new Error('account and onTx callback are required');
  }

  await client.request({
    command: 'subscribe',
    accounts: [account],
  });

  const handler = (tx) => {
    // Stream messages include tx_json / transaction and meta
    const normalized = {
      ...tx,
      meta: tx.meta || tx.metaData,
      validated: tx.validated === true,
    };

    if (!isSuccessfulValidated(normalized)) {
      return;
    }

    const { delivered } = extractDeliveredAmount(normalized);
    onTx(normalized, delivered);
  };

  client.on('transaction', handler);

  return {
    unsubscribe: async () => {
      client.off('transaction', handler);
      try {
        await client.request({
          command: 'unsubscribe',
          accounts: [account],
        });
      } catch {
        // ignore if already disconnected
      }
    },
  };
}

/**
 * For EscrowFinish: read XRP balance change for the vendor (Destination).
 * Confirmed on Altnet testnet: getBalanceChanges reports vendor XRP delta
 * equal to the escrowed amount (in drops) after tesSUCCESS EscrowFinish.
 *
 * @param {object} txResult - validated transaction result with meta
 * @param {string} vendorAddress
 * @returns {{ xrpDeltaDrops: string|null, engineResult: string, validated: boolean }}
 */
function vendorBalanceDeltaFromEscrowFinish(txResult, vendorAddress) {
  const meta = txResult.meta || txResult.metaData || {};
  const engineResult =
    meta.TransactionResult
    || txResult.engine_result
    || txResult.engineResult
    || '';
  const validated = txResult.validated === true;

  if (engineResult !== 'tesSUCCESS' || !validated) {
    return { xrpDeltaDrops: null, engineResult, validated };
  }

  if (!vendorAddress) {
    return { xrpDeltaDrops: null, engineResult, validated };
  }

  const changes = xrpl.getBalanceChanges(meta);
  for (const accountChange of changes) {
    if (accountChange.account !== vendorAddress) continue;
    for (const bal of accountChange.balances || []) {
      // XRP changes use currency 'XRP' and value in XRP (not drops) in getBalanceChanges
      if (bal.currency === 'XRP') {
        try {
          const drops = xrpl.xrpToDrops(bal.value);
          return {
            xrpDeltaDrops: String(drops),
            engineResult,
            validated,
          };
        } catch {
          continue;
        }
      }
    }
  }

  return { xrpDeltaDrops: null, engineResult, validated };
}

module.exports = {
  extractDeliveredAmount,
  isSuccessfulValidated,
  watchAccount,
  vendorBalanceDeltaFromEscrowFinish,
};
