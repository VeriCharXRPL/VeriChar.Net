'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  generateConditionPair,
  validateFulfillment,
} = require('../src/condition');

describe('condition', () => {
  it('generates matching condition and fulfillment', () => {
    const { condition, fulfillment } = generateConditionPair();
    assert.equal(typeof condition, 'string');
    assert.equal(typeof fulfillment, 'string');
    assert.ok(condition.length > 0);
    assert.ok(fulfillment.length > 0);
    assert.equal(validateFulfillment(fulfillment, condition), true);
  });

  it('rejects mismatched fulfillment', () => {
    const a = generateConditionPair();
    const b = generateConditionPair();
    assert.equal(validateFulfillment(b.fulfillment, a.condition), false);
  });

  it('rejects empty input', () => {
    assert.equal(validateFulfillment('', ''), false);
    assert.equal(validateFulfillment(null, null), false);
  });
});
