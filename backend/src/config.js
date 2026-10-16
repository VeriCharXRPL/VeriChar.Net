'use strict';

/**
 * VeriChar backend config.
 * Testnet only. Never point at mainnet.
 */
require('dotenv').config();

/**
 * Hosts listed as Testnet WebSocket endpoints on
 * https://xrpl.org/docs/tutorials/public-servers
 * Only Testnet hosts (not Mainnet, not Devnet).
 */
const ALLOWED_TESTNET_HOSTS = new Set([
  's.altnet.rippletest.net',
  'clio.altnet.rippletest.net',
  'testnet.honeycluster.io',
  'testnet.xrpl-labs.com',
]);

/**
 * Require wss: and hostname exactly on the Testnet allowlist.
 * @param {string} urlString
 * @returns {string} the validated URL
 */
function assertTestnetUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error(
      'SECURITY: XRPL_WS_URL is not a valid URL. Refusing to start.'
    );
  }

  if (parsed.protocol !== 'wss:') {
    throw new Error(
      'SECURITY: XRPL_WS_URL must use wss:. Refusing to start.'
    );
  }

  if (!ALLOWED_TESTNET_HOSTS.has(parsed.hostname)) {
    throw new Error(
      'SECURITY: XRPL_WS_URL hostname is not an allowed Testnet host. Refusing to start.'
    );
  }

  return urlString;
}

const XRPL_WS_URL = assertTestnetUrl(
  process.env.XRPL_WS_URL || 'wss://s.altnet.rippletest.net:51233'
);

module.exports = {
  XRPL_WS_URL,
  assertTestnetUrl,
  ALLOWED_TESTNET_HOSTS,
};
