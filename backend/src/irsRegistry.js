'use strict';

const { createHash, randomUUID } = require('node:crypto');

const IRS_EO_BMF_REGIONS = Object.freeze([
  { region: '1', url: 'https://www.irs.gov/pub/irs-soi/eo1.csv' },
  { region: '2', url: 'https://www.irs.gov/pub/irs-soi/eo2.csv' },
  { region: '3', url: 'https://www.irs.gov/pub/irs-soi/eo3.csv' },
  { region: '4', url: 'https://www.irs.gov/pub/irs-soi/eo4.csv' },
]);

const REQUIRED_COLUMNS = ['EIN', 'NAME', 'STATE', 'SUBSECTION', 'DEDUCTIBILITY'];
const BATCH_SIZE = 500;
const MAX_CSV_RECORD_LENGTH = 16_384;

function normalizeEin(value) {
  if (typeof value !== 'string') throw new Error('invalid_ein');
  const normalized = value.trim().replace(/-/g, '');
  if (!/^\d{9}$/.test(normalized)) throw new Error('invalid_ein');
  return normalized;
}

function parseCsvRecord(record) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  let quoteClosed = false;

  for (let index = 0; index < record.length; index += 1) {
    const character = record[index];
    if (inQuotes) {
      if (character === '"' && record[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
        quoteClosed = true;
      } else {
        field += character;
      }
    } else if (character === ',') {
      fields.push(field);
      field = '';
      quoteClosed = false;
    } else if (character === '"' && field === '' && !quoteClosed) {
      inQuotes = true;
    } else if (quoteClosed && character !== ' ' && character !== '\r') {
      throw new Error('invalid_csv_quote');
    } else if (!quoteClosed) {
      field += character;
    }
  }

  if (inQuotes) throw new Error('incomplete_csv_record');
  fields.push(field.replace(/\r$/, ''));
  return fields;
}

function isCompleteCsvRecord(record) {
  let inQuotes = false;
  for (let index = 0; index < record.length; index += 1) {
    if (record[index] !== '"') continue;
    if (inQuotes && record[index + 1] === '"') {
      index += 1;
    } else {
      inQuotes = !inQuotes;
    }
  }
  return !inQuotes;
}

async function* readCsvRecords(body, onChunk = () => {}) {
  if (!body || typeof body[Symbol.asyncIterator] !== 'function') {
    throw new Error('invalid_csv_body');
  }

  const decoder = new TextDecoder('utf-8', { fatal: true });
  let pending = '';
  let record = '';

  for await (const chunk of body) {
    onChunk(chunk);
    pending += decoder.decode(chunk, { stream: true });
    let newlineIndex = pending.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = pending.slice(0, newlineIndex).replace(/\r$/, '');
      pending = pending.slice(newlineIndex + 1);
      record = record ? `${record}\n${line}` : line;
      if (record.length > MAX_CSV_RECORD_LENGTH) throw new Error('csv_record_too_large');
      if (isCompleteCsvRecord(record)) {
        if (record.trim()) yield parseCsvRecord(record);
        record = '';
      }
      newlineIndex = pending.indexOf('\n');
    }
  }

  pending += decoder.decode();
  if (pending) record = record ? `${record}\n${pending}` : pending;
  if (record) {
    if (!isCompleteCsvRecord(record)) throw new Error('incomplete_csv_record');
    yield parseCsvRecord(record);
  }
}

async function parseEoBmfCsv(body, region, onRecord, onChunk) {
  const rows = readCsvRecords(body, onChunk);
  const first = await rows.next();
  if (first.done) throw new Error('empty_eo_bmf_feed');

  const headers = first.value.map((header, index) => (
    (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim().toUpperCase()
  ));
  const positions = Object.fromEntries(headers.map((header, index) => [header, index]));
  for (const column of REQUIRED_COLUMNS) {
    if (positions[column] === undefined) throw new Error(`missing_eo_bmf_column_${column.toLowerCase()}`);
  }

  let count = 0;
  for await (const fields of rows) {
    if (fields.length !== headers.length) throw new Error('invalid_eo_bmf_column_count');
    const record = {
      ein: normalizeEin(fields[positions.EIN]),
      organizationName: fields[positions.NAME].trim(),
      state: fields[positions.STATE].trim(),
      subsectionCode: fields[positions.SUBSECTION].trim(),
      deductibilityCode: fields[positions.DEDUCTIBILITY].trim(),
      sourceRegion: region,
    };
    if (!record.organizationName) throw new Error('empty_eo_bmf_organization_name');
    await onRecord(record);
    count += 1;
  }
  return count;
}

function makeInsertQuery(tableName, records) {
  const values = [];
  const tuples = records.map((record, rowIndex) => {
    const offset = rowIndex * 6;
    values.push(
      record.ein,
      record.organizationName,
      record.state,
      record.subsectionCode,
      record.deductibilityCode,
      record.sourceRegion
    );
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
  });
  return {
    text: `INSERT INTO ${tableName}
      (ein, organization_name, state, subsection_code, deductibility_code, source_region)
      VALUES ${tuples.join(', ')}
      ON CONFLICT (ein) DO UPDATE SET
        organization_name = EXCLUDED.organization_name,
        state = EXCLUDED.state,
        subsection_code = EXCLUDED.subsection_code,
        deductibility_code = EXCLUDED.deductibility_code,
        source_region = EXCLUDED.source_region`,
    values,
  };
}

async function syncEoBmfRegistry({ pool, fetchImpl = globalThis.fetch, now = () => new Date() }) {
  if (!pool || typeof pool.connect !== 'function') throw new Error('database_pool_required');
  if (typeof fetchImpl !== 'function') throw new Error('fetch_unavailable');

  const client = await pool.connect();
  const syncId = randomUUID();
  const sourceUrls = {};
  const lastModified = {};
  const checksums = {};
  let recordCount = 0;

  try {
    await client.query('BEGIN');
    await client.query(`CREATE TEMP TABLE irs_eo_bmf_import (
      ein CHAR(9) PRIMARY KEY,
      organization_name TEXT NOT NULL,
      state TEXT NOT NULL,
      subsection_code TEXT NOT NULL,
      deductibility_code TEXT NOT NULL,
      source_region TEXT NOT NULL
    ) ON COMMIT DROP`);

    for (const source of IRS_EO_BMF_REGIONS) {
      const response = await fetchImpl(source.url, {
        signal: AbortSignal.timeout(120_000),
        headers: { accept: 'text/csv' },
      });
      if (!response.ok || !response.body) {
        throw new Error(`irs_eo_bmf_download_failed_region_${source.region}`);
      }

      const digest = createHash('sha256');
      let batch = [];
      sourceUrls[source.region] = source.url;
      lastModified[source.region] = response.headers.get('last-modified');
      const parsedCount = await parseEoBmfCsv(
        response.body,
        source.region,
        async (record) => {
          batch.push(record);
          if (batch.length >= BATCH_SIZE) {
            const query = makeInsertQuery('irs_eo_bmf_import', batch);
            await client.query(query.text, query.values);
            batch = [];
          }
        },
        (chunk) => digest.update(chunk)
      );
      if (parsedCount === 0) throw new Error(`empty_irs_eo_bmf_region_${source.region}`);
      if (batch.length) {
        const query = makeInsertQuery('irs_eo_bmf_import', batch);
        await client.query(query.text, query.values);
      }
      checksums[source.region] = digest.digest('hex');
      recordCount += parsedCount;
    }

    const stagedCount = await client.query('SELECT COUNT(*) AS count FROM irs_eo_bmf_import');
    recordCount = Number(stagedCount.rows[0].count);
    const fetchedAt = now();
    await client.query(
      `INSERT INTO irs_eo_bmf_sync_runs
         (id, fetched_at, source_urls, last_modified, checksums, record_count)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [syncId, fetchedAt, sourceUrls, lastModified, checksums, recordCount]
    );
    await client.query('DELETE FROM irs_eo_bmf_records');
    await client.query(
      `INSERT INTO irs_eo_bmf_records
         (ein, organization_name, state, subsection_code, deductibility_code,
          source_region, sync_id)
       SELECT ein, organization_name, state, subsection_code, deductibility_code,
              source_region, $1
       FROM irs_eo_bmf_import`,
      [syncId]
    );
    await client.query('COMMIT');
    return { syncId, fetchedAt, recordCount, sourceUrls, lastModified, checksums };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], 'IRS sync and rollback both failed.');
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  IRS_EO_BMF_REGIONS,
  makeInsertQuery,
  normalizeEin,
  parseCsvRecord,
  parseEoBmfCsv,
  syncEoBmfRegistry,
};