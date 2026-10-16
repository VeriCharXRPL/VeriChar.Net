'use strict';

/**
 * PREIMAGE-SHA-256 crypto-condition helpers for XRPL conditional escrow.
 * Only crypto-condition type supported by XRPL: PREIMAGE-SHA-256.
 * Never log or persist the fulfillment outside the oracle's secure store.
 */

const crypto = require('crypto');
const cc = require('five-bells-condition');

/**
 * Generate a new condition + fulfillment pair.
 * @returns {{ condition: string, fulfillment: string }}
 *   Hex strings (uppercase) suitable for EscrowCreate.Condition / EscrowFinish.Fulfillment.
 *   Caller must treat `fulfillment` as secret.
 */
function generateConditionPair() {
  const preimage = crypto.randomBytes(32);
  const fulfillmentObj = new cc.PreimageSha256();
  fulfillmentObj.setPreimage(preimage);

  const condition = fulfillmentObj.getConditionBinary().toString('hex').toUpperCase();
  const fulfillment = fulfillmentObj.serializeBinary().toString('hex').toUpperCase();

  return { condition, fulfillment };
}

/**
 * Validate that a fulfillment matches a condition (local check, no ledger).
 * Derives the condition from the fulfillment binary and compares hex.
 * @param {string} fulfillmentHex
 * @param {string} conditionHex
 * @returns {boolean}
 */
function validateFulfillment(fulfillmentHex, conditionHex) {
  try {
    if (!fulfillmentHex || !conditionHex) return false;
    const fulfillment = cc.fromFulfillmentBinary(
      Buffer.from(fulfillmentHex, 'hex')
    );
    const derived = fulfillment.getConditionBinary().toString('hex').toUpperCase();
    return derived === String(conditionHex).toUpperCase();
  } catch {
    return false;
  }
}

module.exports = {
  generateConditionPair,
  validateFulfillment,
};
