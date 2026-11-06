'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createApplicationStore } = require('../src/applicationStore');

function fakePool(currentStatus) {
  const statements = [];
  const client = {
    async query(statement, values = []) {
      statements.push(statement);
      if (statement.startsWith('SELECT status')) {
        return { rows: [{ status: currentStatus }] };
      }
      if (statement.startsWith('UPDATE applications')) {
        return {
          rows: [{
            id: values[0],
            public_name: values[2],
            status: values[1],
          }],
        };
      }
      return { rows: [] };
    },
    release() {},
  };
  return {
    statements,
    pool: {
      connect: async () => client,
    },
  };
}

describe('application review persistence', () => {
  it('updates status, public profile, and reviewer audit atomically', async () => {
    const { pool, statements } = fakePool('in_review');
    const store = createApplicationStore({ pool });
    const result = await store.review(
      'f8a5717c-350e-4da3-85b9-89be54e21e8c',
      'verified',
      'reviewer-1',
      { name: 'Community Aid', summary: 'Local support.', account: null }
    );

    assert.equal(result.status, 'verified');
    assert.ok(statements.includes('BEGIN'));
    assert.ok(statements.some((statement) => statement.startsWith('UPDATE applications')));
    assert.ok(statements.some((statement) => statement.startsWith('INSERT INTO application_status_events')));
    assert.ok(statements.includes('COMMIT'));
  });

  it('rejects invalid status transitions without updating the record', async () => {
    const { pool, statements } = fakePool('submitted');
    const store = createApplicationStore({ pool });
    const result = await store.review(
      'f8a5717c-350e-4da3-85b9-89be54e21e8c',
      'verified',
      'reviewer-1'
    );

    assert.deepEqual(result, { conflict: true, status: 'submitted' });
    assert.ok(statements.includes('ROLLBACK'));
    assert.equal(statements.some((statement) => statement.startsWith('UPDATE applications')), false);
  });
});
