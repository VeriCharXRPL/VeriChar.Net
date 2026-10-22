'use strict';

/**
 * Reserve helpers.
 * Check account_info OwnerCount; fund base and owner reserves explicitly.
 * While an escrow is incomplete, the sender is responsible for its owner reserve.
 *
 * Live reserve values come from the ledger (server_state / account_info).
 * Do not hardcode production amounts — validator votes can change them.
 */

const { xrpl } = require('./client');

/**
 * Read current base and owner reserve from the network (drops).
 * @param {xrpl.Client} client
 * @returns {Promise<{ baseReserveDrops: string, ownerReserveDrops: string }>}
 */
async function getNetworkReserves(client) {
  const state = await client.request({ command: 'server_state' });
  const validated = state.result.state.validated_ledger
    || state.result.state;

  // Fields are in drops on recent servers; confirmed via XRPL.org reserves docs.
  const base = String(validated.reserve_base || validated.reserve_base_xrp * 1_000_000);
  const owner = String(validated.reserve_inc || validated.reserve_inc_xrp * 1_000_000);

  if (!/^\d+$/.test(base) || !/^\d+$/.test(owner)) {
    throw new Error('Could not parse network reserves from server_state');
  }

  return {
    baseReserveDrops: base,
    ownerReserveDrops: owner,
  };
}

/**
 * account_info for OwnerCount and balance.
 * @param {xrpl.Client} client
 * @param {string} address
 * @returns {Promise<{
 *   ownerCount: number,
 *   balanceDrops: string,
 *   sequence: number
 * }>}
 */
async function getAccountReserveInfo(client, address) {
  if (!address || typeof address !== 'string') {
    throw new Error('address is required');
  }

  const info = await client.request({
    command: 'account_info',
    account: address,
    ledger_index: 'validated',
    api_version: 2,
  });

  const accountData = info.result.account_data;

  return {
    ownerCount: accountData.OwnerCount,
    balanceDrops: accountData.Balance,
    sequence: accountData.Sequence,
  };
}

/**
 * Required XRP (drops) to hold for an account given its OwnerCount,
 * plus optional extra owner objects about to be created (e.g. new escrows).
 *
 * required = base + (ownerCount + extraOwners) * ownerReserve
 *
 * @param {xrpl.Client} client
 * @param {string} address
 * @param {number} [extraOwners=0] - e.g. number of escrows about to be created
 * @returns {Promise<{
 *   requiredDrops: string,
 *   balanceDrops: string,
 *   shortfallDrops: string,
 *   ownerCount: number,
 *   baseReserveDrops: string,
 *   ownerReserveDrops: string
 * }>}
 */
async function checkReserveRequirement(client, address, extraOwners = 0) {
  if (extraOwners < 0 || !Number.isInteger(extraOwners)) {
    throw new Error('extraOwners must be a non-negative integer');
  }

  const [reserves, account] = await Promise.all([
    getNetworkReserves(client),
    getAccountReserveInfo(client, address),
  ]);

  const totalOwners = account.ownerCount + extraOwners;
  const required =
    BigInt(reserves.baseReserveDrops)
    + BigInt(totalOwners) * BigInt(reserves.ownerReserveDrops);

  const balance = BigInt(account.balanceDrops);
  const shortfall = required > balance ? required - balance : 0n;

  return {
    requiredDrops: required.toString(),
    balanceDrops: account.balanceDrops,
    shortfallDrops: shortfall.toString(),
    ownerCount: account.ownerCount,
    baseReserveDrops: reserves.baseReserveDrops,
    ownerReserveDrops: reserves.ownerReserveDrops,
  };
}

/**
 * Fund an account so it can cover base + owner reserves for planned objects.
 * Uses a Payment from a funded source wallet (e.g. faucet-funded).
 *
 * UNCONFIRMED: which account should own escrows / who pays reserves in production.
 *
 * @param {xrpl.Client} client
 * @param {xrpl.Wallet} sourceWallet
 * @param {string} destinationAddress
 * @param {string} amountDrops
 * @returns {Promise<object>}
 */
async function fundReserves(client, sourceWallet, destinationAddress, amountDrops) {
  if (!/^\d+$/.test(String(amountDrops)) || BigInt(amountDrops) <= 0n) {
    throw new Error('amountDrops must be a positive integer string');
  }

  const tx = {
    TransactionType: 'Payment',
    Account: sourceWallet.address,
    Destination: destinationAddress,
    Amount: String(amountDrops),
  };

  xrpl.validate(tx);

  const prepared = await client.autofill(tx);
  const signed = sourceWallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  const engineResult = result.result.meta?.TransactionResult
    || result.result.engine_result;

  if (engineResult !== 'tesSUCCESS') {
    throw new Error(`fundReserves Payment failed: ${engineResult}`);
  }

  return result.result;
}

module.exports = {
  getNetworkReserves,
  getAccountReserveInfo,
  checkReserveRequirement,
  fundReserves,
};
