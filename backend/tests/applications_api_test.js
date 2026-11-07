'use strict';

const { createHash, randomUUID } = require('node:crypto');
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createApiServer } = require('../src/api');
const { decryptPrivateData } = require('../src/applicationData');

const reviewerToken = 'reviewer-test-token-0123456789abcdef';
const tenantToken = 'tenant-test-token-0123456789abcdef';
const applicationId = randomUUID();
const encryptionKey = Buffer.alloc(32, 3);

function tokenRecord(token, tenantId, scopes) {
  return {
    keyHash: createHash('sha256').update(token).digest('hex'),
    tenantId,
    scopes,
  };
}

describe('organization application API', () => {
  let server;
  let baseUrl;
  let storedApplication;
  let reviewedStatus;
  let lookedUpEin;
  let challengeValid;
  const publicCharities = [{
    id: randomUUID(),
    name: 'Community Aid',
    summary: 'Local community support.',
    account: 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59',
  }];

  before(async () => {
    challengeValid = true;
    server = createApiServer({
      tokenRecords: [
        tokenRecord(reviewerToken, 'reviewer-1', ['applications:review']),
        tokenRecord(tenantToken, 'tenant-1', ['tenant:read']),
      ],
      corsOrigins: ['https://verichar.net'],
      applicationDataKey: encryptionKey.toString('hex'),
      verifyApplication: async () => challengeValid,
      applicationStore: {
        create: async (application, encryptedPrivateData) => {
          storedApplication = {
            ...application,
            public_listing: application.publicListing,
            private_data: encryptedPrivateData.data,
            private_nonce: encryptedPrivateData.nonce,
            private_auth_tag: encryptedPrivateData.authTag,
            status: 'submitted',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          };
          return {
            id: application.id,
            kind: application.kind,
            public_name: application.publicName,
            status: 'submitted',
            created_at: storedApplication.created_at,
          };
        },
        listPublicCharities: async () => publicCharities,
        listForReview: async () => storedApplication ? [storedApplication] : [],
        getForReview: async (id) => id === storedApplication?.id ? storedApplication : null,
        getIrsEoBmfRecordByEin: async (ein) => {
          lookedUpEin = ein;
          return {
            source: 'IRS EO BMF',
            status: 'candidate_501c3',
            checkedAt: '2026-11-06T00:00:00.000Z',
            record: {
              name: 'Community Aid',
              state: 'NY',
              subsectionCode: '03',
              deductibilityCode: '1',
              sourceRegion: '1',
            },
          };
        },
        review: async (id, status, reviewerId, publicProfile) => {
          if (id !== storedApplication?.id) return null;
          reviewedStatus = { id, status, reviewerId, publicProfile };
          storedApplication.status = status;
          return { id, status, reviewerId };
        },
      },
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('serves the verified charity directory without exposing applications', async () => {
    const response = await fetch(`${baseUrl}/v1/public/charities`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { charities: publicCharities });
  });

  it('accepts a challenged application and stores private data encrypted', async () => {
    const response = await fetch(`${baseUrl}/v1/applications`, {
      method: 'POST',
      headers: {
        origin: 'https://verichar.net',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        privacyConsent: true,
        kind: 'charity',
        organizationName: 'Community Aid',
        contactName: 'A. Contact',
        contactEmail: 'contact@example.org',
        taxId: '12-3456789',
        publicListing: true,
        publicSummary: 'Local community support.',
        challengeToken: 'valid-test-token',
      }),
    });

    assert.equal(response.status, 201);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://verichar.net');
    const result = await response.json();
    assert.equal(result.application.status, 'submitted');
    assert.equal(result.application.kind, 'charity');
    assert.notEqual(storedApplication.private_data.toString('utf8').includes('123456789'), true);
    assert.deepEqual(decryptPrivateData(storedApplication, encryptionKey), {
      organizationName: 'Community Aid',
      contactName: 'A. Contact',
      contactEmail: 'contact@example.org',
      website: '',
      taxId: '123456789',
      xrplAccount: null,
      publicSummary: 'Local community support.',
    });
  });

  it('rejects invalid application challenges without storing private data', async () => {
    const previous = storedApplication;
    challengeValid = false;
    const response = await fetch(`${baseUrl}/v1/applications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ challengeToken: 'invalid' }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'invalid_application_challenge' });
    assert.equal(storedApplication, previous);
    challengeValid = true;
  });

  it('requires the reviewer scope to view or update applications', async () => {
    const denied = await fetch(`${baseUrl}/v1/reviewer/applications`, {
      headers: { authorization: `Bearer ${tenantToken}` },
    });
    assert.equal(denied.status, 403);

    const authorized = await fetch(`${baseUrl}/v1/reviewer/applications`, {
      headers: { authorization: `Bearer ${reviewerToken}` },
    });
    assert.equal(authorized.status, 200);
    const { applications } = await authorized.json();
    assert.equal(applications[0].name, 'Community Aid');
    assert.equal('private_data' in applications[0], false);
  });

  it('returns private application fields only to an authorized reviewer', async () => {
    const response = await fetch(
      `${baseUrl}/v1/reviewer/applications/${storedApplication.id}`,
      { headers: { authorization: `Bearer ${reviewerToken}` } }
    );
    assert.equal(response.status, 200);
    const { application } = await response.json();
    assert.equal(application.name, 'Community Aid');
    assert.equal(application.privateData.taxId, '123456789');
    assert.equal(application.privateData.contactEmail, 'contact@example.org');
  });

  it('limits IRS record matches to reviewers and never returns the EIN', async () => {
    const url = `${baseUrl}/v1/reviewer/applications/${storedApplication.id}/irs-status`;
    const denied = await fetch(url, {
      headers: { authorization: `Bearer ${tenantToken}` },
    });
    assert.equal(denied.status, 403);

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${reviewerToken}` },
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(lookedUpEin, '123456789');
    assert.equal(result.irsRecord.status, 'candidate_501c3');
    assert.equal(result.irsRecord.record.name, 'Community Aid');
    assert.equal(JSON.stringify(result).includes('123456789'), false);
    assert.equal(storedApplication.status, 'submitted');
  });

  it('records reviewer identity when an application status changes', async () => {
    const response = await fetch(
      `${baseUrl}/v1/reviewer/applications/${storedApplication.id}/status`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${reviewerToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ status: 'in_review' }),
      }
    );
    assert.equal(response.status, 200);
    assert.deepEqual(reviewedStatus, {
      id: storedApplication.id,
      status: 'in_review',
      reviewerId: 'reviewer-1',
      publicProfile: null,
    });
  });

  it('publishes the opted-in charity profile only after reviewer approval', async () => {
    const response = await fetch(
      `${baseUrl}/v1/reviewer/applications/${storedApplication.id}/status`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${reviewerToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ status: 'verified' }),
      }
    );
    assert.equal(response.status, 200);
    assert.deepEqual(reviewedStatus.publicProfile, {
      name: 'Community Aid',
      summary: 'Local community support.',
      account: null,
    });
  });

  it('supports CORS preflight for the public application form', async () => {
    const response = await fetch(`${baseUrl}/v1/applications`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://verichar.net',
        'access-control-request-method': 'POST',
      },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://verichar.net');
    assert.equal(response.headers.get('access-control-allow-methods'), 'GET, POST, OPTIONS');
  });
});
