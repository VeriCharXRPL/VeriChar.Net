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

const API_SCOPES = new Set(['tenant:read', 'ledger:read']);

function readApiTokens(value = process.env.API_TOKENS_JSON || '[]') {
  let records;
  try {
    records = JSON.parse(value);
  } catch {
    throw new Error('SECURITY: API_TOKENS_JSON must be valid JSON.');
  }

  if (!Array.isArray(records)) {
    throw new Error('SECURITY: API_TOKENS_JSON must be a JSON array.');
  }

  const hashes = new Set();
  return records.map((record) => {
    if (
      !record
      || typeof record.keyHash !== 'string'
      || !/^[a-fA-F0-9]{64}$/.test(record.keyHash)
      || typeof record.tenantId !== 'string'
      || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(record.tenantId)
      || !Array.isArray(record.scopes)
      || record.scopes.some((scope) => !API_SCOPES.has(scope))
    ) {
      throw new Error(
        'SECURITY: API_TOKENS_JSON entries need a SHA-256 keyHash, tenantId, and supported scopes.'
      );
    }

    const keyHash = record.keyHash.toLowerCase();
    if (hashes.has(keyHash)) {
      throw new Error('SECURITY: API_TOKENS_JSON contains a duplicate keyHash.');
    }
    hashes.add(keyHash);

    return {
      keyHash,
      tenantId: record.tenantId,
      scopes: [...new Set(record.scopes)],
    };
  });
}

function readApiCorsOrigins(value = process.env.API_CORS_ORIGINS || '[]') {
  let origins;
  try {
    origins = JSON.parse(value);
  } catch {
    throw new Error('SECURITY: API_CORS_ORIGINS must be valid JSON.');
  }

  if (!Array.isArray(origins)) {
    throw new Error('SECURITY: API_CORS_ORIGINS must be a JSON array.');
  }

  const seen = new Set();
  return origins.map((origin) => {
    if (typeof origin !== 'string') {
      throw new Error('SECURITY: API_CORS_ORIGINS entries must be exact origins.');
    }

    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error('SECURITY: API_CORS_ORIGINS contains an invalid origin.');
    }

    const isLocalHttp = parsed.protocol === 'http:'
      && ['localhost', '127.0.0.1'].includes(parsed.hostname);
    if (
      parsed.origin !== origin
      || (parsed.protocol !== 'https:' && !isLocalHttp)
      || parsed.username
      || parsed.password
    ) {
      throw new Error(
        'SECURITY: API_CORS_ORIGINS entries must be HTTPS origins (HTTP is allowed only for localhost development).'
      );
    }

    if (seen.has(origin)) {
      throw new Error('SECURITY: API_CORS_ORIGINS contains a duplicate origin.');
    }
    seen.add(origin);
    return origin;
  });
}

const API_TOKENS = readApiTokens();
const API_CORS_ORIGINS = readApiCorsOrigins();

module.exports = {
  XRPL_WS_URL,
  assertTestnetUrl,
  ALLOWED_TESTNET_HOSTS,
  API_TOKENS,
  API_SCOPES,
  readApiTokens,
  API_CORS_ORIGINS,
  readApiCorsOrigins,
};
