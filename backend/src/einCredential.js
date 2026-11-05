'use strict';

const { convertStringToHex } = require('xrpl');
const { connectClient, fundWallet } = require('./client');

/**
 * Public EIN credential stack for charity / vendor / enterprise verification.
 * Only public data (EIN string) is stored on-chain.
 * Follows exact shapes from:
 * - https://xrpl.org/docs/references/protocol/transactions/types/credentialcreate
 * - https://xrpl.org/docs/references/protocol/transactions/types/credentialaccept
 * - https://xrpl.org/docs/tutorials/compliance-features/verify-credentials
 * - https://xrpl.org/docs/references/protocol/transactions/types/permissioneddomainset
 *
 * Testnet only. Never points at Mainnet.
 */

const LSF_ACCEPTED = 0x00010000;

/**
 * Issue a public EIN credential.
 * @param {import('xrpl').Client} client
 * @param {import('xrpl').Wallet} issuerWallet - government or trusted third-party
 * @param {string} subjectAddress - charity / vendor / enterprise account
 * @param {string} ein - public EIN string, e.g. "EIN-12-3456789"
 * @returns {Promise<import('xrpl').SubmitResponse>}
 */
async function issueEinCredential(client, issuerWallet, subjectAddress, ein) {
  const credentialType = convertStringToHex(ein).toUpperCase();
  const tx = {
    TransactionType: 'CredentialCreate',
    Account: issuerWallet.address,
    Subject: subjectAddress,
    CredentialType: credentialType,
  };
  return client.submitAndWait(tx, { wallet: issuerWallet, autofill: true });
}

/**
 * Accept a public EIN credential (must be sent by the subject).
 * @param {import('xrpl').Client} client
 * @param {import('xrpl').Wallet} subjectWallet
 * @param {string} issuerAddress
 * @param {string} ein
 * @returns {Promise<import('xrpl').SubmitResponse>}
 */
async function acceptEinCredential(client, subjectWallet, issuerAddress, ein) {
  const credentialType = convertStringToHex(ein).toUpperCase();
  const tx = {
    TransactionType: 'CredentialAccept',
    Account: subjectWallet.address,
    Issuer: issuerAddress,
    CredentialType: credentialType,
  };
  return client.submitAndWait(tx, { wallet: subjectWallet, autofill: true });
}

/**
 * Verify a public EIN credential exists, is accepted, and is not expired.
 * @param {import('xrpl').Client} client
 * @param {string} subjectAddress
 * @param {string} issuerAddress
 * @param {string} ein
 * @returns {Promise<{ valid: boolean, credential: object | null }>}
 */
async function verifyEinCredential(client, subjectAddress, issuerAddress, ein) {
  const credentialType = convertStringToHex(ein).toUpperCase();
  try {
    const response = await client.request({
      command: 'ledger_entry',
      credential: {
        subject: subjectAddress,
        issuer: issuerAddress,
        credential_type: credentialType,
      },
      ledger_index: 'validated',
    });
    const credential = response.result.node;
    const accepted = !!(credential.Flags & LSF_ACCEPTED);
    const expired = credential.Expiration
      ? (await client.getLedgerIndex()) > credential.Expiration
      : false;
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
 * Create a Permissioned Domain that accepts the public EIN credential.
 * @param {import('xrpl').Client} client
 * @param {import('xrpl').Wallet} ownerWallet
 * @param {string} issuerAddress
 * @param {string} ein
 * @returns {Promise<{ result: import('xrpl').SubmitResponse, domainID: string | null }>}
 */
async function createEinPermissionedDomain(client, ownerWallet, issuerAddress, ein) {
  const credentialType = convertStringToHex(ein).toUpperCase();
  const tx = {
    TransactionType: 'PermissionedDomainSet',
    Account: ownerWallet.address,
    AcceptedCredentials: [
      {
        Credential: {
          Issuer: issuerAddress,
          CredentialType: credentialType,
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
 * @param {string} ein
 * @returns {Promise<object>}
 */
async function runEinCredentialFlow(ein = 'EIN-12-3456789') {
  const client = await connectClient();
  try {
    const { wallet: issuerWallet } = await fundWallet(client);
    const { wallet: subjectWallet } = await fundWallet(client);

    const createResult = await issueEinCredential(
      client,
      issuerWallet,
      subjectWallet.address,
      ein
    );
    if (createResult.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error('CredentialCreate failed');
    }

    const acceptResult = await acceptEinCredential(
      client,
      subjectWallet,
      issuerWallet.address,
      ein
    );
    if (acceptResult.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error('CredentialAccept failed');
    }

    const verification = await verifyEinCredential(
      client,
      subjectWallet.address,
      issuerWallet.address,
      ein
    );

    const domain = await createEinPermissionedDomain(
      client,
      issuerWallet,
      issuerWallet.address,
      ein
    );

    return {
      issuer: issuerWallet.address,
      subject: subjectWallet.address,
      ein,
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
  issueEinCredential,
  acceptEinCredential,
  verifyEinCredential,
  createEinPermissionedDomain,
  runEinCredentialFlow,
  LSF_ACCEPTED,
};
