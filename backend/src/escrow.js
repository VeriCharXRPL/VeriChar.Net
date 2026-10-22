'use strict';

/**
 * XRPL conditional escrow module (XRP drops).
 * EscrowCreate: Condition (PREIMAGE-SHA-256) + Destination + CancelAfter.
 * EscrowFinish: Fulfillment (held by oracle).
 * EscrowCancel: after CancelAfter.
 *
 * UNCONFIRMED (do not invent):
 * - Which account owns each escrow / who pays owner reserve
 * - Token/RLUSD escrow (needs issuer asfAllowTrustLineLocking)
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
 * Minimum Fee for EscrowFinish with a fulfillment (drops).
 * Per xrpl.org EscrowFinish docs (reference fee 10 drops):
 *   330 drops + 10 drops for every 16 bytes of the fulfillment
 *   → 330 + 10 * floor(fulfillment_bytes / 16)
 * Example: 32-byte fulfillment → 350 drops.
 * Multi-signing adds cost on top (not implemented here).
 * Generalized signer_count form from transaction-cost page is UNVERIFIED here
 * relative to the explicit 330 + 10-per-16-bytes wording on the EscrowFinish page.
 * @param {string} fulfillmentHex
 * @returns {string} fee in drops
 */
function escrowFinishFeeDrops(fulfillmentHex) {
  const bytes = Buffer.from(fulfillmentHex, 'hex').length;
  const drops = 330 + 10 * Math.floor(bytes / 16);
  return String(drops);
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

  const minFee = escrowFinishFeeDrops(fulfillment);

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
