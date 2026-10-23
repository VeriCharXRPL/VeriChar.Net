'use strict';

/**
 * XRPL conditional escrow module (XRP drops).
 * EscrowCreate: Condition (PREIMAGE-SHA-256) + Destination + CancelAfter.
 * EscrowFinish: Fulfillment (held by oracle).
 * EscrowCancel: after CancelAfter.
 *
 * UNCONFIRMED (do not invent):
 * - Which account owns each escrow / who pays owner reserve
 * - How 1% vendor fee is collected at release
 * - Token/RLUSD escrow (needs issuer asfAllowTrustLineLocking)
 */

const { xrpl } = require('./client');
const { generateConditionPair, validateFulfillment } = require('./condition');
const { vericharMemo } = require('./memo');
const { submitTransaction } = require('./transactions');

/**
 * Create a conditional XRP escrow.
 *
 * @param {xrpl.Client} client
 * @param {xrpl.Wallet} senderWallet - account that creates (and owns) the escrow
 * @param {object} opts
 * @param {string} opts.destination - vendor address (fixed Destination)
 * @param {string} opts.amountDrops - XRP amount in drops (string)
 * @param {number} opts.cancelAfterSeconds - positive safe integer seconds until CancelAfter
 * @param {string} [opts.condition] - pre-generated condition hex; must be paired with fulfillment
 * @param {string} [opts.fulfillment] - pre-generated fulfillment; must be paired with condition
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
  if (!Number.isSafeInteger(cancelAfterSeconds) || cancelAfterSeconds < 1) {
    throw new Error('cancelAfterSeconds must be a positive safe integer');
  }

  let condition = providedCondition;
  let fulfillment = providedFulfillment;

  if (condition === undefined && fulfillment === undefined) {
    const pair = generateConditionPair();
    condition = pair.condition;
    fulfillment = pair.fulfillment;
  } else {
    if (condition === undefined || fulfillment === undefined) {
      throw new Error('condition and fulfillment must be provided together');
    }
    if (!validateFulfillment(fulfillment, condition)) {
      throw new Error('provided fulfillment does not match condition');
    }
  }

  const now = new Date();
  const nowRippleTime = xrpl.isoTimeToRippleTime(now.toISOString());
  if (cancelAfterSeconds > 0xFFFFFFFF - nowRippleTime) {
    throw new Error('cancelAfterSeconds exceeds the XRPL CancelAfter range');
  }
  const cancelAfter = xrpl.isoTimeToRippleTime(
    new Date(now.getTime() + cancelAfterSeconds * 1000).toISOString()
  );

  const tx = {
    TransactionType: 'EscrowCreate',
    Account: senderWallet.address,
    Destination: destination,
    Amount: String(amountDrops),
    Condition: condition,
    CancelAfter: cancelAfter,
    Memos: vericharMemo(),
  };

  xrpl.validate(tx);

  const result = await submitTransaction(
    client,
    tx,
    senderWallet,
    'EscrowCreate'
  );

  return {
    result,
    sequence: result.tx_json.Sequence,
    condition,
    fulfillment,
    cancelAfter,
  };
}

/**
 * Finish a conditional escrow by supplying the fulfillment.
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

  const tx = {
    TransactionType: 'EscrowFinish',
    Account: finisherWallet.address,
    Owner: owner,
    OfferSequence: offerSequence,
    Condition: condition,
    Fulfillment: fulfillment,
    Memos: vericharMemo(),
  };

  xrpl.validate(tx);

  return submitTransaction(client, tx, finisherWallet, 'EscrowFinish');
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
    Memos: vericharMemo(),
  };

  xrpl.validate(tx);

  return submitTransaction(client, tx, cancelerWallet, 'EscrowCancel');
}

module.exports = {
  createConditionalEscrow,
  finishEscrow,
  cancelEscrow,
};
