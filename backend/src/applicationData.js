'use strict';

const { createCipheriv, createDecipheriv, randomBytes } = require('node:crypto');
const xrpl = require('xrpl');

const APPLICATION_KINDS = new Set(['charity', 'vendor', 'enterprise']);

function getApplicationDataKey(value = process.env.APPLICATION_DATA_KEY) {
  if (typeof value !== 'string' || !/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error('APPLICATION_DATA_KEY must be 32 bytes encoded as 64 hexadecimal characters.');
  }
  return Buffer.from(value, 'hex');
}

function encryptPrivateData(value, key = getApplicationDataKey()) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ]);
  return { data, nonce, authTag: cipher.getAuthTag() };
}

function decryptPrivateData(record, key = getApplicationDataKey()) {
  const decipher = createDecipheriv('aes-256-gcm', key, record.private_nonce);
  decipher.setAuthTag(record.private_auth_tag);
  const data = Buffer.concat([
    decipher.update(record.private_data),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(data);
}

function requiredText(value, field, maxLength) {
  if (typeof value !== 'string') throw new Error(`invalid_${field}`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`invalid_${field}`);
  }
  return normalized;
}

function validateApplication(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('invalid_application');
  }
  if (input.privacyConsent !== true) throw new Error('invalid_privacy_consent');

  const kind = input.kind;
  if (!APPLICATION_KINDS.has(kind)) throw new Error('invalid_kind');
  if ('publicListing' in input && typeof input.publicListing !== 'boolean') {
    throw new Error('invalid_public_listing');
  }
  if (input.publicSummary !== undefined && typeof input.publicSummary !== 'string') {
    throw new Error('invalid_public_summary');
  }

  const organizationName = requiredText(input.organizationName, 'organization_name', 160);
  const contactName = requiredText(input.contactName, 'contact_name', 120);
  const contactEmail = requiredText(input.contactEmail, 'contact_email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new Error('invalid_contact_email');
  }

  let website = '';
  if (input.website) {
    if (typeof input.website !== 'string' || input.website.length > 2048) {
      throw new Error('invalid_website');
    }
    let parsed;
    try {
      parsed = new URL(input.website);
    } catch {
      throw new Error('invalid_website');
    }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      throw new Error('invalid_website');
    }
    website = parsed.href;
  }

  let xrplAccount = null;
  if (input.xrplAccount) {
    if (typeof input.xrplAccount !== 'string' || !xrpl.isValidAddress(input.xrplAccount)) {
      throw new Error('invalid_xrpl_account');
    }
    xrplAccount = input.xrplAccount;
  }

  let taxId = '';
  if (kind === 'charity') {
    if (typeof input.taxId !== 'string' || !/^\d{2}-?\d{7}$/.test(input.taxId.trim())) {
      throw new Error('invalid_tax_id');
    }
    taxId = input.taxId.trim().replace('-', '');
  }

  const publicListing = input.publicListing === true;
  if (publicListing && kind !== 'charity') {
    throw new Error('invalid_public_listing');
  }

  let publicSummary = '';
  if (publicListing) {
    publicSummary = requiredText(input.publicSummary, 'public_summary', 500);
  } else if (typeof input.publicSummary === 'string') {
    publicSummary = input.publicSummary.trim().slice(0, 500);
  }

  return {
    kind,
    publicName: '',
    publicSummary: '',
    xrplAccount: null,
    publicListing,
    privateData: {
      organizationName,
      contactName,
      contactEmail,
      website,
      taxId,
      xrplAccount,
      publicSummary,
    },
  };
}

module.exports = {
  decryptPrivateData,
  encryptPrivateData,
  getApplicationDataKey,
  validateApplication,
};
