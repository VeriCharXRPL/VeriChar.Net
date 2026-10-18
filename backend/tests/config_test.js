'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  assertTestnetUrl,
  readApiTokens,
  readApiCorsOrigins,
} = require('../src/config');

describe('config assertTestnetUrl', () => {
  it('accepts official Altnet WebSocket URL', () => {
    assert.equal(
      assertTestnetUrl('wss://s.altnet.rippletest.net:51233'),
      'wss://s.altnet.rippletest.net:51233'
    );
  });

  describe('config readApiTokens', () => {
    it('accepts hashed tenant tokens with supported scopes', () => {
      assert.deepEqual(
        readApiTokens(JSON.stringify([{
          keyHash: 'a'.repeat(64),
          tenantId: 'tenant-1',
          scopes: ['tenant:read', 'ledger:read'],
        }])),
        [{
          keyHash: 'a'.repeat(64),
          tenantId: 'tenant-1',
          scopes: ['tenant:read', 'ledger:read'],
        }]
      );
    });

    describe('config readApiCorsOrigins', () => {
      it('accepts exact HTTPS origins and localhost development origins', () => {
        assert.deepEqual(
          readApiCorsOrigins('["https://verichar.net","http://localhost:8080"]'),
          ['https://verichar.net', 'http://localhost:8080']
        );
      });

      it('rejects wildcard, insecure remote, and malformed origins', () => {
        assert.throws(() => readApiCorsOrigins('["*"]'), /API_CORS_ORIGINS/);
        assert.throws(
          () => readApiCorsOrigins('["http://verichar.net"]'),
          /API_CORS_ORIGINS/
        );
        assert.throws(() => readApiCorsOrigins('{'), /API_CORS_ORIGINS/);
      });
    });

    it('rejects malformed token configuration and unsupported scopes', () => {
      assert.throws(() => readApiTokens('{'), /API_TOKENS_JSON/);
      assert.throws(() => readApiTokens('{"tenantId":"tenant-1"}'), /API_TOKENS_JSON/);
      assert.throws(
        () => readApiTokens(JSON.stringify([{
          keyHash: 'a'.repeat(64),
          tenantId: 'tenant-1',
          scopes: ['network:mainnet'],
        }])),
        /API_TOKENS_JSON/
      );
    });
  });

  it('rejects hostname that only contains the substring altnet', () => {
    assert.throws(
      () => assertTestnetUrl('wss://evil.example.com/altnet'),
      /SECURITY/
    );
  });

  it('rejects lookalike mainnet-proxy hostname', () => {
    assert.throws(
      () => assertTestnetUrl('wss://altnet-proxy.mainnet-node.com'),
      /SECURITY/
    );
  });

  it('rejects non-wss protocol', () => {
    assert.throws(
      () => assertTestnetUrl('https://s.altnet.rippletest.net:51233'),
      /SECURITY/
    );
  });
});
