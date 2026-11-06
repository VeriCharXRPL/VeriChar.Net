'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  decryptPrivateData,
  encryptPrivateData,
  getApplicationDataKey,
  validateApplication,
} = require('../src/applicationData');

describe('application data protection', () => {
  const key = Buffer.alloc(32, 7);

  it('encrypts private fields and decrypts them only with the configured key', () => {
    const privateData = { contactEmail: 'contact@example.org', taxId: '123456789' };
    const encrypted = encryptPrivateData(privateData, key);

    assert.notEqual(encrypted.data.toString('utf8'), JSON.stringify(privateData));
    assert.deepEqual(decryptPrivateData({
      private_data: encrypted.data,
      private_nonce: encrypted.nonce,
      private_auth_tag: encrypted.authTag,
    }, key), privateData);
    assert.throws(() => decryptPrivateData({
      private_data: encrypted.data,
      private_nonce: encrypted.nonce,
      private_auth_tag: encrypted.authTag,
    }, Buffer.alloc(32, 8)));
  });

  it('requires an exact 32-byte hexadecimal application key', () => {
    assert.throws(() => getApplicationDataKey('not-a-key'), /APPLICATION_DATA_KEY/);
    assert.equal(getApplicationDataKey('ab'.repeat(32)).length, 32);
  });

  it('requires an EIN for charity applications and keeps it in private data', () => {
    const application = validateApplication({
      privacyConsent: true,
      kind: 'charity',
      organizationName: 'Community Aid',
      contactName: 'A. Contact',
      contactEmail: 'CONTACT@example.org',
      taxId: '12-3456789',
      publicListing: true,
      publicSummary: 'Local community support.',
    });

    assert.equal(application.publicName, '');
    assert.equal(application.privateData.taxId, '123456789');
    assert.equal(application.privateData.organizationName, 'Community Aid');
    assert.equal(application.privateData.contactEmail, 'contact@example.org');
    assert.equal(application.publicListing, true);
    assert.equal('taxId' in application, false);
    assert.throws(() => validateApplication({
      privacyConsent: true,
      kind: 'charity',
      organizationName: 'Community Aid',
      contactName: 'A. Contact',
      contactEmail: 'contact@example.org',
    }), /invalid_tax_id/);
  });

  it('requires explicit consent before accepting applicant data', () => {
    assert.throws(() => validateApplication({
      kind: 'vendor',
      organizationName: 'Supply Co.',
      contactName: 'A. Contact',
      contactEmail: 'contact@example.org',
    }), /invalid_privacy_consent/);
  });

  it('prevents vendor and enterprise applications from opting into the charity directory', () => {
    assert.throws(() => validateApplication({
      privacyConsent: true,
      kind: 'vendor',
      organizationName: 'Supply Co.',
      contactName: 'A. Contact',
      contactEmail: 'contact@example.org',
      publicListing: true,
    }), /invalid_public_listing/);
  });
});
