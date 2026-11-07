'use strict';

const { Readable } = require('node:stream');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeEin,
  parseCsvRecord,
  parseEoBmfCsv,
} = require('../src/irsRegistry');

describe('IRS EO BMF feed parsing', () => {
  it('normalizes EINs without losing leading zeroes', () => {
    assert.equal(normalizeEin('01-0019116'), '010019116');
    assert.throws(() => normalizeEin('12345'), /invalid_ein/);
  });

  it('parses quoted commas, escaped quotes, and embedded newlines', () => {
    assert.deepEqual(
      parseCsvRecord('"Community,\n""Care""",03'),
      ['Community,\n"Care"', '03']
    );
  });

  it('maps EO BMF fields by header and captures a section 501(c)(3) record', async () => {
    const csv = [
      'EIN,NAME,STATE,SUBSECTION,DEDUCTIBILITY',
      '010019116,"Community, Care",NY,03,1',
    ].join('\n');
    const records = [];
    const count = await parseEoBmfCsv(
      Readable.from([Buffer.from(csv)]),
      '1',
      async (record) => records.push(record)
    );

    assert.equal(count, 1);
    assert.deepEqual(records[0], {
      ein: '010019116',
      organizationName: 'Community, Care',
      state: 'NY',
      subsectionCode: '03',
      deductibilityCode: '1',
      sourceRegion: '1',
    });
  });

  it('rejects feeds missing required IRS columns or malformed rows', async () => {
    await assert.rejects(
      parseEoBmfCsv(
        Readable.from(['EIN,NAME\n010019116,Community']),
        '1',
        async () => {}
      ),
      /missing_eo_bmf_column_state/
    );
    await assert.rejects(
      parseEoBmfCsv(
        Readable.from(['EIN,NAME,STATE,SUBSECTION,DEDUCTIBILITY\n123,Community,NY,03,1']),
        '1',
        async () => {}
      ),
      /invalid_ein/
    );
  });

  it('replaces the cached snapshot only after every IRS region imports successfully', async () => {
    const queries = [];
    const client = {
      query: async (text, values) => {
        queries.push({ text, values });
        return text.includes('SELECT COUNT(*)') ? { rows: [{ count: '4' }] } : { rows: [] };
      },
      release: () => {},
    };
    const csvFor = (region) => [
      'EIN,NAME,STATE,SUBSECTION,DEDUCTIBILITY',
      `${String(region).padStart(9, '0')},Organization ${region},NY,03,1`,
    ].join('\n');

    const result = await require('../src/irsRegistry').syncEoBmfRegistry({
      pool: { connect: async () => client },
      fetchImpl: async (url) => {
        const region = Number(url.match(/eo(\d)\.csv$/)[1]);
        return {
          ok: true,
          body: Readable.from([Buffer.from(csvFor(region))]),
          headers: { get: () => 'Tue, 13 Oct 2026 00:00:00 GMT' },
        };
      },
      now: () => new Date('2026-11-06T00:00:00.000Z'),
    });

    assert.equal(result.recordCount, 4);
    assert.equal(queries.at(-1).text, 'COMMIT');
    assert.ok(queries.some(({ text }) => text === 'DELETE FROM irs_eo_bmf_records'));
  });

  it('rolls back and keeps the previous snapshot when an IRS region fails', async () => {
    const queries = [];
    const client = {
      query: async (text) => {
        queries.push(text);
        return { rows: [] };
      },
      release: () => {},
    };
    let requestCount = 0;

    await assert.rejects(
      require('../src/irsRegistry').syncEoBmfRegistry({
        pool: { connect: async () => client },
        fetchImpl: async () => {
          requestCount += 1;
          if (requestCount === 2) {
            return { ok: false, body: null, headers: { get: () => null } };
          }
          return {
            ok: true,
            body: Readable.from([Buffer.from('EIN,NAME,STATE,SUBSECTION,DEDUCTIBILITY\n000000001,Org,NY,03,1')]),
            headers: { get: () => null },
          };
        },
      }),
      /irs_eo_bmf_download_failed_region_2/
    );

    assert.ok(queries.includes('ROLLBACK'));
    assert.equal(queries.includes('DELETE FROM irs_eo_bmf_records'), false);
  });
});