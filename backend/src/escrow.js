'use strict';

/**
 * XRPL conditional escrow module (XRP drops).
 * EscrowCreate: Condition (PREIMAGE-SHA-256) + Destination + CancelAfter.
 * EscrowFinish: Fulfillment (held by oracle).
 * EscrowCancel: after CancelAfter.
 *
 * This helper creates XRP-only escrows. XRPL token escrow is a separate,
 * amendment-enabled feature and is not implemented or tested here.
 */

const { xrpl } = require('./client');
const { generateConditionPair, validateFulfillment } = require('./condition');

/**
 * Create a conditional XRP escrow.
 *
 * @param {xrpl.Client} client
 * @param {xrpl.Wallet} senderWallet - account that creates (and owns) the escrow
 * @param {object} opts
 * @param {string} opts.destination - vendor address (fixed Destination)
 * @param {string} opts.amountDrops - XRP amount in drops (string)
 * @param {number} opts.cancelAfterSeconds - seconds from now until CancelAfter
 * @param {string} [opts.condition] - optional pre-generated condition hex
 * @param {string} [opts.fulfillment] - optional pre-generated fulfillment
 * @returns {Promise<{
 *   result: object,
 *   sequence: number,
 *   condition: string,
 *   fulfillment: string,
 *   cancelAfter: number
 * }>}
 *   fulfillment returned only so the oracle can store it securely. Do not log.
 */
async function createConditionalEscrow(client, senderWallet, opts) {
  const {
    destination,
    amountDrops,
    cancelAfterSeconds,
    condition: providedCondition,
    fulfillment: providedFulfillment,
  } = opts;

  if (!destination || typeof destination !== 'string') {
    throw new Error('destination is required');
  }
  if (!amountDrops || !/^\d+$/.test(String(amountDrops)) || BigInt(amountDrops) <= 0n) {
    throw new Error('amountDrops must be a positive integer string');
  }
  if (!cancelAfterSeconds || cancelAfterSeconds < 1) {
    throw new Error('cancelAfterSeconds must be >= 1 (every escrow needs CancelAfter)');
  }

  let condition = providedCondition;
  let fulfillment = providedFulfillment;

  if (!condition || !fulfillment) {
    const pair = generateConditionPair();
    condition = pair.condition;
    fulfillment = pair.fulfillment;
  } else if (!validateFulfillment(fulfillment, condition)) {
    throw new Error('provided fulfillment does not match condition');
  }

  const cancelAfter = xrpl.isoTimeToRippleTime(
    new Date(Date.now() + cancelAfterSeconds * 1000).toISOString()
  );

  const tx = {
    TransactionType: 'EscrowCreate',
    Account: senderWallet.address,
    Destination: destination,
    Amount: String(amountDrops),
    Condition: condition,
    CancelAfter: cancelAfter,
  };

  xrpl.validate(tx);

  const prepared = await client.autofill(tx);
  const signed = senderWallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  const engineResult =
    result.result.meta?.TransactionResult || result.result.engine_result;

  if (engineResult !== 'tesSUCCESS') {
    throw new Error(`EscrowCreate failed: ${engineResult}`);
  }

  return {
    result: result.result,
    sequence: prepared.Sequence,
    condition,
    fulfillment,
    cancelAfter,
  };
}

/**
 * Minimum single-signature EscrowFinish fee, scaled by the ledger reference fee.
 * XRPL's formula is reference_fee * (33 + fulfillment_bytes / 16) when there
 * are no additional signers.
 * @param {string} fulfillmentHex
 * @param {string} [referenceFeeDrops='10']
 * @returns {string} fee in drops
 */
function escrowFinishFeeDrops(fulfillmentHex, referenceFeeDrops = '10') {
  if (typeof fulfillmentHex !== 'string' || !/^(?:[0-9a-f]{2})+$/i.test(fulfillmentHex)) {
    throw new Error('fulfillmentHex must be non-empty, even-length hexadecimal.');
  }
  if (!/^\d+$/.test(String(referenceFeeDrops)) || BigInt(referenceFeeDrops) <= 0n) {
    throw new Error('referenceFeeDrops must be a positive integer string.');
  }

  const fulfillmentBytes = BigInt(fulfillmentHex.length / 2);
  const referenceFee = BigInt(referenceFeeDrops);
  return (referenceFee * (33n + fulfillmentBytes / 16n)).toString();
}

/**
 * Finish a conditional escrow by supplying the fulfillment.
 * Fee is set explicitly to at least the xrpl.org EscrowFinish-with-fulfillment minimum.
 *
 * @param {xrpl.Client} client
 * @param {xrpl.Wallet} finisherWallet - pays the fee
 * @param {object} opts
 * @param {string} opts.owner
 * @param {number} opts.offerSequence
 * @param {string} opts.condition
 * @param {string} opts.fulfillment - secret; never log
 * @returns {Promise<object>}
 */
async function finishEscrow(client, finisherWallet, opts) {
  const { owner, offerSequence, condition, fulfillment } = opts;

  if (!owner || offerSequence == null || !condition || !fulfillment) {
    throw new Error('owner, offerSequence, condition, and fulfillment are required');
  }
  if (!validateFulfillment(fulfillment, condition)) {
    throw new Error('fulfillment does not match condition');
  }

  const feeResponse = await client.request({ command: 'fee' });
  const referenceFeeDrops = feeResponse.result?.drops?.base_fee;
  const minFee = escrowFinishFeeDrops(fulfillment, referenceFeeDrops);

  const tx = {
    TransactionType: 'EscrowFinish',
    Account: finisherWallet.address,
    Owner: owner,
    OfferSequence: offerSequence,
    Condition: condition,
    Fulfillment: fulfillment,
    Fee: minFee,
  };

  xrpl.validate(tx);

  const prepared = await client.autofill(tx);
  // Keep explicit minimum if autofill returned something lower
  if (BigInt(prepared.Fee) < BigInt(minFee)) {
    prepared.Fee = minFee;
  }

  const signed = finisherWallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  const engineResult =
    result.result.meta?.TransactionResult || result.result.engine_result;

  if (engineResult !== 'tesSUCCESS') {
    throw new Error(`EscrowFinish failed: ${engineResult}`);
  }

  return result.result;
}

/**
 * Cancel an expired escrow. Returns funds to the sender (owner).
 *
 * @param {xrpl.Client} client
 * @param {xrpl.Wallet} cancelerWallet
 * @param {object} opts
 * @param {string} opts.owner
 * @param {number} opts.offerSequence
 * @returns {Promise<object>}
 */
async function cancelEscrow(client, cancelerWallet, opts) {
  const { owner, offerSequence } = opts;

  if (!owner || offerSequence == null) {
    throw new Error('owner and offerSequence are required');
  }

  const tx = {
    TransactionType: 'EscrowCancel',
    Account: cancelerWallet.address,
    Owner: owner,
    OfferSequence: offerSequence,
  };

  xrpl.validate(tx);

  const prepared = await client.autofill(tx);
  const signed = cancelerWallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  const engineResult =
    result.result.meta?.TransactionResult || result.result.engine_result;

  if (engineResult !== 'tesSUCCESS') {
    throw new Error(`EscrowCancel failed: ${engineResult}`);
  }

  return result.result;
}

module.exports = {
  createConditionalEscrow,
  finishEscrow,
  cancelEscrow,
  escrowFinishFeeDrops,
};
