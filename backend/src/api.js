'use strict';

const { createHash, timingSafeEqual } = require('node:crypto');
const http = require('node:http');
const xrpl = require('xrpl');
const { API_TOKENS, API_CORS_ORIGINS } = require('./config');
const { connectClient } = require('./client');
const {
  ComplianceClosed,
  assertMayAcceptDonation,
  assertMayIssueTaxReceipt,
  assertMayMarkCharityVerified,
  assertMaySubmitLedgerTransaction,
} = require('./compliance');

function hashToken(token) {
  return createHash('sha256').update(token, 'utf8').digest();
}

function authenticate(request, tokenRecords) {
  const authorization = request.headers.authorization;
  const match = typeof authorization === 'string'
    ? /^Bearer ([A-Za-z0-9._~-]{32,})$/.exec(authorization)
    : null;

  if (!match) return null;

  const presentedHash = hashToken(match[1]);
  let principal = null;
  for (const record of tokenRecords) {
    const storedHash = Buffer.from(record.keyHash, 'hex');
    if (timingSafeEqual(presentedHash, storedHash)) {
      principal = { tenantId: record.tenantId, scopes: record.scopes };
    }
  }
  return principal;
}

function sendJson(response, statusCode, body, headers = {}) {
  const serialized = JSON.stringify(body);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(serialized),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...headers,
  });
  response.end(serialized);
}

const PRODUCT_DOORS = Object.freeze({
  acceptDonation: assertMayAcceptDonation,
  issueTaxReceipt: assertMayIssueTaxReceipt,
  markCharityVerified: assertMayMarkCharityVerified,
  submitLedgerTransaction: assertMaySubmitLedgerTransaction,
});

function productDoor(pathname, method) {
  if (method !== 'POST') return null;
  if (pathname === '/v1/donations') return 'acceptDonation';
  if (pathname === '/v1/receipts') return 'issueTaxReceipt';
  if (/^\/v1\/charities\/[^/]+\/verify$/.test(pathname)) return 'markCharityVerified';
  if (/^\/v1\/networks\/[^/]+\/transactions$/.test(pathname)) return 'submitLedgerTransaction';
  return null;
}

function refuseProductDoor(response, action) {
  try {
    PRODUCT_DOORS[action]();
  } catch (error) {
    if (!(error instanceof ComplianceClosed)) throw error;
  }
  return sendJson(response, 403, { error: 'compliance_closed', action });
}

function createApiServer({
  tokenRecords = API_TOKENS,
  corsOrigins = API_CORS_ORIGINS,
  openTestnetClient = connectClient,
} = {}) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');

    if (request.method === 'GET' && url.pathname === '/healthz') {
      const origin = request.headers.origin;
      const corsHeaders = { vary: 'Origin' };
      if (corsOrigins.includes(origin)) {
        corsHeaders['access-control-allow-origin'] = origin;
      }
      return sendJson(response, 200, { status: 'ok' }, corsHeaders);
    }

    const door = productDoor(url.pathname, request.method);
    if (door) {
      return refuseProductDoor(response, door);
    }

    if (request.method !== 'GET') {
      response.setHeader('allow', 'GET');
      return sendJson(response, 405, { error: 'method_not_allowed' });
    }

    const principal = authenticate(request, tokenRecords);
    if (!principal) {
      return sendJson(response, 401, { error: 'unauthorized' });
    }

    if (url.pathname === '/v1/tenant') {
      if (!principal.scopes.includes('tenant:read')) {
        return sendJson(response, 403, { error: 'insufficient_scope' });
      }
      return sendJson(response, 200, {
        tenantId: principal.tenantId,
        scopes: principal.scopes,
      });
    }

    const accountRoute = /^\/v1\/networks\/([^/]+)\/accounts\/([^/]+)$/
      .exec(url.pathname);
    if (!accountRoute) {
      return sendJson(response, 404, { error: 'not_found' });
    }

    const [, network, encodedAddress] = accountRoute;
    if (network !== 'testnet') {
      return sendJson(response, 404, { error: 'network_unavailable' });
    }
    if (!principal.scopes.includes('ledger:read')) {
      return sendJson(response, 403, { error: 'insufficient_scope' });
    }

    let address;
    try {
      address = decodeURIComponent(encodedAddress);
    } catch {
      return sendJson(response, 400, { error: 'invalid_account' });
    }
    if (!xrpl.isValidAddress(address)) {
      return sendJson(response, 400, { error: 'invalid_account' });
    }

    let client;
    let result;
    try {
      client = await openTestnetClient();
      result = await client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated',
        api_version: 2,
      });
    } catch {
      if (client?.isConnected()) {
        try {
          await client.disconnect();
        } catch {
          console.error('Failed to close XRPL Testnet connection.');
        }
      }
      return sendJson(response, 502, { error: 'testnet_unavailable' });
    }

    if (client.isConnected()) {
      try {
        await client.disconnect();
      } catch {
        console.error('Failed to close XRPL Testnet connection.');
        return sendJson(response, 502, { error: 'testnet_unavailable' });
      }
    }

    return sendJson(response, 200, {
      network: 'testnet',
      account: result.result.account_data,
      validatedLedger: result.result.ledger_index,
    });
  });
}

module.exports = { createApiServer, authenticate };
