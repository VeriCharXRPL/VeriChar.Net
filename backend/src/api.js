'use strict';

const { createHash, randomUUID, timingSafeEqual } = require('node:crypto');
const http = require('node:http');
const xrpl = require('xrpl');
const { API_TOKENS, API_CORS_ORIGINS } = require('./config');
const { connectClient } = require('./client');
const { createApplicationStore } = require('./applicationStore');
const {
  decryptPrivateData,
  encryptPrivateData,
  getApplicationDataKey,
  validateApplication,
} = require('./applicationData');
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

async function verifyApplicationChallenge(token, secret = process.env.TURNSTILE_SECRET_KEY) {
  if (!secret) throw new Error('TURNSTILE_SECRET_KEY is not configured.');
  if (typeof token !== 'string' || !token) return false;

  const body = new URLSearchParams({ secret, response: token });
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Turnstile verification is unavailable.');
  const result = await response.json();
  return result.success === true
    && result.action === 'organization_application'
    && ['verichar.net', 'www.verichar.net', 'verichar.vercel.app', 'localhost', '127.0.0.1']
      .includes(result.hostname);
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

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16 * 1024) {
      request.resume();
      return null;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function createApiServer({
  tokenRecords = API_TOKENS,
  corsOrigins = API_CORS_ORIGINS,
  openTestnetClient = connectClient,
  applicationStore = createApplicationStore(),
  applicationDataKey,
  verifyApplication = verifyApplicationChallenge,
} = {}) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const origin = request.headers.origin;
    if (origin && corsOrigins.includes(origin)) {
      response.setHeader('access-control-allow-origin', origin);
      response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
      response.setHeader('access-control-allow-headers', 'authorization, content-type');
      response.setHeader('access-control-max-age', '600');
      response.setHeader('vary', 'Origin');
    }

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      return response.end();
    }

    if (request.method === 'GET' && url.pathname === '/healthz') {
      const corsHeaders = { vary: 'Origin' };
      if (corsOrigins.includes(origin)) {
        corsHeaders['access-control-allow-origin'] = origin;
      }
      return sendJson(response, 200, { status: 'ok' }, corsHeaders);
    }

    if (request.method === 'GET' && url.pathname === '/v1/public/charities') {
      try {
        const charities = await applicationStore.listPublicCharities();
        return sendJson(response, 200, { charities });
      } catch {
        console.error('Public charity directory request failed.');
        return sendJson(response, 503, { error: 'application_service_unavailable' });
      }
    }

    if (request.method === 'POST' && url.pathname === '/v1/applications') {
      const body = await readBody(request);
      if (body === null) {
        return sendJson(response, 400, { error: 'invalid_json_or_body_too_large' });
      }

      try {
        if (!await verifyApplication(body.challengeToken)) {
          return sendJson(response, 400, { error: 'invalid_application_challenge' });
        }
      } catch {
        console.error('Application challenge verification failed.');
        return sendJson(response, 503, { error: 'application_intake_unavailable' });
      }

      let application;
      try {
        application = validateApplication(body);
      } catch (error) {
        if (error.message.startsWith('invalid_')) {
          return sendJson(response, 400, { error: error.message });
        }
        throw error;
      }

      let encryptedPrivateData;
      try {
        encryptedPrivateData = encryptPrivateData(
          application.privateData,
          getApplicationDataKey(applicationDataKey)
        );
      } catch {
        console.error('Application private-data encryption is unavailable.');
        return sendJson(response, 503, { error: 'application_intake_unavailable' });
      }

      try {
        const created = await applicationStore.create(
          { ...application, id: randomUUID() },
          encryptedPrivateData
        );
        return sendJson(response, 201, {
          application: {
            id: created.id,
            kind: created.kind,
            status: created.status,
            createdAt: created.created_at,
          },
        });
      } catch {
        console.error('Application persistence failed.');
        return sendJson(response, 503, { error: 'application_service_unavailable' });
      }
    }

    const uuidPattern = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
    const reviewerStatusRoute = new RegExp(
      `^/v1/reviewer/applications/(${uuidPattern})/status$`,
      'i'
    )
      .exec(url.pathname);
    if (request.method === 'POST' && reviewerStatusRoute) {
      const principal = authenticate(request, tokenRecords);
      if (!principal) {
        return sendJson(response, 401, { error: 'unauthorized' });
      }
      if (!principal.scopes.includes('applications:review')) {
        return sendJson(response, 403, { error: 'insufficient_scope' });
      }

      const body = await readBody(request);
      if (body === null || !['in_review', 'verified', 'rejected'].includes(body.status)) {
        return sendJson(response, 400, { error: 'invalid_status' });
      }
      try {
        let publicProfile = null;
        if (body.status === 'verified') {
          const current = await applicationStore.getForReview(reviewerStatusRoute[1]);
          if (!current) return sendJson(response, 404, { error: 'application_not_found' });
          if (current.public_listing) {
            const privateData = decryptPrivateData(
              current,
              getApplicationDataKey(applicationDataKey)
            );
            publicProfile = {
              name: privateData.organizationName,
              summary: privateData.publicSummary,
              account: privateData.xrplAccount,
            };
          }
        }
        const result = await applicationStore.review(
          reviewerStatusRoute[1],
          body.status,
          principal.tenantId,
          publicProfile
        );
        if (!result) return sendJson(response, 404, { error: 'application_not_found' });
        if (result.conflict) {
          return sendJson(response, 409, {
            error: 'invalid_status_transition',
            status: result.status,
          });
        }
        return sendJson(response, 200, { application: result });
      } catch {
        console.error('Application review update failed.');
        return sendJson(response, 503, { error: 'application_service_unavailable' });
      }
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

    if (
      url.pathname === '/v1/reviewer/applications'
      || new RegExp(`^/v1/reviewer/applications/${uuidPattern}$`, 'i').test(url.pathname)
    ) {
      if (!principal.scopes.includes('applications:review')) {
        return sendJson(response, 403, { error: 'insufficient_scope' });
      }
      try {
        if (url.pathname === '/v1/reviewer/applications') {
          const applications = await applicationStore.listForReview();
          const key = getApplicationDataKey(applicationDataKey);
          return sendJson(response, 200, {
            applications: applications.map((application) => ({
              id: application.id,
              kind: application.kind,
              name: decryptPrivateData(application, key).organizationName,
              status: application.status,
              createdAt: application.created_at,
              updatedAt: application.updated_at,
            })),
          });
        }
        const id = url.pathname.split('/').pop();
        const application = await applicationStore.getForReview(id);
        if (!application) return sendJson(response, 404, { error: 'application_not_found' });
        const privateData = decryptPrivateData(
          application,
          getApplicationDataKey(applicationDataKey)
        );
        return sendJson(response, 200, {
          application: {
            id: application.id,
            kind: application.kind,
            name: privateData.organizationName,
            summary: application.public_summary,
            xrplAccount: application.xrpl_account,
            publicListing: application.public_listing,
            status: application.status,
            createdAt: application.created_at,
            updatedAt: application.updated_at,
            privateData,
          },
        });
      } catch {
        console.error('Reviewer application lookup failed.');
        return sendJson(response, 503, { error: 'application_service_unavailable' });
      }
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
