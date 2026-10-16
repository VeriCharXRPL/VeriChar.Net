'use strict';

const xrpl = require('xrpl');
const { XRPL_WS_URL } = require('./config');

/**
 * Create and connect an XRPL client to the configured testnet.
 * Caller must disconnect when done.
 * @returns {Promise<xrpl.Client>}
 */
async function connectClient() {
  const client = new xrpl.Client(XRPL_WS_URL);
  await client.connect();
  return client;
}

/**
 * Fund a new wallet from the testnet faucet.
 * @param {xrpl.Client} client
 * @returns {Promise<{ wallet: xrpl.Wallet, balance: string }>}
 */
async function fundWallet(client) {
  const result = await client.fundWallet();
  return { wallet: result.wallet, balance: result.balance };
}

module.exports = {
  connectClient,
  fundWallet,
  xrpl,
};
