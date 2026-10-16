'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { assertTestnetUrl } = require('../src/config');

describe('config assertTestnetUrl', () => {
  it('accepts official Altnet WebSocket URL', () => {
    assert.equal(
      assertTestnetUrl('wss://s.altnet.rippletest.net:51233'),
      'wss://s.altnet.rippletest.net:51233'
    );
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
