'use strict';

const { convertStringToHex } = require('xrpl');
const { connectClient, fundWallet } = require('./client');

/**
 * Testnet exercise for a VeriChar-defined organization-review credential.
 * XRPL records issuer claims; it does not verify IRS status or issuer authority.
 * Follows exact shapes from:
 * - https://xrpl.org/docs/references/protocol/transactions/types/credentialcreate
 * - https://xrpl.org/docs/references/protocol/transactions/types/credentialaccept
 * - https://xrpl.org/docs/tutorials/compliance-features/verify-credentials
 * - https://xrpl.org/docs/references/protocol/transactions/types/permissioneddomainset
 *
 * Testnet only. Never points at Mainnet.
 */

const LSF_ACCEPTED = 0x00010000;
const CREDENTIAL_TYPE = convertStringToHex('VERICHAR_ORGANIZATION_REVIEW_V1').toUpperCase();

/**
 * Issue an organization-review credential. Review evidence remains off-ledger.
 * @param {import('xrpl').Client} client
 * @param {import('xrpl').Wallet} issuerWallet - issuer of the assertion
 * @param {string} subjectAddress - charity / vendor / enterprise account
 * @returns {Promise<import('xrpl').SubmitResponse>}
 */
async function issueOrganizationCredential(client, issuerWallet, subjectAddress) {
  const tx = {
    TransactionType: 'CredentialCreate',
    Account: issuerWallet.address,
    Subject: subjectAddress,
    CredentialType: CREDENTIAL_TYPE,
  };
  return client.submitAndWait(tx, { wallet: issuerWallet, autofill: true });
}

/**
 * Accept the credential (must be sent by the subject).
 * @param {import('xrpl').Client} client
 * @param {import('xrpl').Wallet} subjectWallet
 * @param {string} issuerAddress
 * @returns {Promise<import('xrpl').SubmitResponse>}
 */
async function acceptOrganizationCredential(client, subjectWallet, issuerAddress) {
  const tx = {
    TransactionType: 'CredentialAccept',
    Account: subjectWallet.address,
    Issuer: issuerAddress,
    CredentialType: CREDENTIAL_TYPE,
  };
  return client.submitAndWait(tx, { wallet: subjectWallet, autofill: true });
}

/**
 * Verify a credential exists, is accepted, and is not expired.
 * @param {import('xrpl').Client} client
 * @param {string} subjectAddress
 * @param {string} issuerAddress
 * @returns {Promise<{ valid: boolean, credential: object | null }>}
 */
async function verifyOrganizationCredential(client, subjectAddress, issuerAddress) {
  try {
    const response = await client.request({
      command: 'ledger_entry',
      credential: {
        subject: subjectAddress,
        issuer: issuerAddress,
        credential_type: CREDENTIAL_TYPE,
      },
      ledger_index: 'validated',
    });
    const credential = response.result.node;
    const accepted = !!(credential.Flags & LSF_ACCEPTED);
    let expired = false;
    if (credential.Expiration !== undefined) {
      if (!Number.isSafeInteger(credential.Expiration)) {
        throw new Error('Credential expiration is invalid.');
      }
      const ledgerResponse = await client.request({
        command: 'ledger',
        ledger_index: 'validated',
      });
      const closeTime = ledgerResponse.result?.ledger?.close_time;
      if (!Number.isSafeInteger(closeTime)) {
        throw new Error('Could not read validated ledger close time.');
      }
      expired = closeTime > credential.Expiration;
    }
    return {
      valid: accepted && !expired,
      credential,
    };
  } catch (err) {
    if (err.data?.error === 'entryNotFound') {
      return { valid: false, credential: null };
    }
    throw err;
  }
}

/**
 * Create a Permissioned Domain that accepts the organization-review credential.
 * @param {import('xrpl').Client} client
 * @param {import('xrpl').Wallet} ownerWallet
 * @param {string} issuerAddress
 * @returns {Promise<{ result: import('xrpl').SubmitResponse, domainID: string | null }>}
 */
async function createOrganizationPermissionedDomain(client, ownerWallet, issuerAddress) {
  const tx = {
    TransactionType: 'PermissionedDomainSet',
    Account: ownerWallet.address,
    AcceptedCredentials: [
      {
        Credential: {
          Issuer: issuerAddress,
          CredentialType: CREDENTIAL_TYPE,
        },
      },
    ],
  };
  const result = await client.submitAndWait(tx, { wallet: ownerWallet, autofill: true });

  let domainID = null;
  for (const node of result.result.meta.AffectedNodes) {
    if (node.CreatedNode?.LedgerEntryType === 'PermissionedDomain') {
      domainID = node.CreatedNode.LedgerIndex;
      break;
    }
  }
  return { result, domainID };
}

/**
 * Full end-to-end Testnet flow: fund, issue, accept, verify, create domain.
 * Used for CI / local validation. Does not open product gates.
 * @returns {Promise<object>}
 */
async function runOrganizationCredentialFlow() {
  const client = await connectClient();
  try {
    const { wallet: issuerWallet } = await fundWallet(client);
    const { wallet: subjectWallet } = await fundWallet(client);

    const createResult = await issueOrganizationCredential(
      client,
      issuerWallet,
      subjectWallet.address
    );
    if (createResult.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error('CredentialCreate failed');
    }

    const acceptResult = await acceptOrganizationCredential(
      client,
      subjectWallet,
      issuerWallet.address
    );
    if (acceptResult.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error('CredentialAccept failed');
    }

    const verification = await verifyOrganizationCredential(
      client,
      subjectWallet.address,
      issuerWallet.address
    );

    const domain = await createOrganizationPermissionedDomain(
      client,
      issuerWallet,
      issuerWallet.address
    );

    return {
      issuer: issuerWallet.address,
      subject: subjectWallet.address,
      credentialType: 'VERICHAR_ORGANIZATION_REVIEW_V1',
      valid: verification.valid,
      domainID: domain.domainID,
      createResult: createResult.result.meta.TransactionResult,
      acceptResult: acceptResult.result.meta.TransactionResult,
      domainResult: domain.result.result.meta.TransactionResult,
    };
  } finally {
    await client.disconnect();
  }
}

module.exports = {
  issueOrganizationCredential,
  acceptOrganizationCredential,
  verifyOrganizationCredential,
  createOrganizationPermissionedDomain,
  runOrganizationCredentialFlow,
  LSF_ACCEPTED,
};
