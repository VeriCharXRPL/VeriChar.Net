'use strict';

const { Pool } = require('pg');

function createApplicationStore({ pool } = {}) {
  let connectionPool = pool;

  function getPool() {
    if (connectionPool) return connectionPool;
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured.');
    }

    connectionPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: true },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    return connectionPool;
  }

  return {
    async create(application, encryptedPrivateData) {
      const { rows } = await getPool().query(
        `INSERT INTO applications (
           id, kind, public_name, public_summary, xrpl_account, public_listing,
           private_data, private_nonce, private_auth_tag
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, kind, public_name, status, created_at`,
        [
          application.id,
          application.kind,
          application.publicName,
          application.publicSummary,
          application.xrplAccount,
          application.publicListing,
          encryptedPrivateData.data,
          encryptedPrivateData.nonce,
          encryptedPrivateData.authTag,
        ]
      );
      return rows[0];
    },

    async listPublicCharities() {
      const { rows } = await getPool().query(
        `SELECT id, public_name AS name, public_summary AS summary, xrpl_account AS account
         FROM applications
         WHERE kind = 'charity' AND status = 'verified' AND public_listing = TRUE
         ORDER BY public_name`
      );
      return rows;
    },

    async listForReview() {
      const { rows } = await getPool().query(
        `SELECT id, kind, public_name, public_summary, xrpl_account, public_listing,
                status, private_data, private_nonce, private_auth_tag, created_at, updated_at
         FROM applications
         ORDER BY created_at DESC
         LIMIT 100`
      );
      return rows;
    },

    async getForReview(id) {
      const { rows } = await getPool().query(
        `SELECT id, kind, public_name, public_summary, xrpl_account, public_listing,
                status, private_data, private_nonce, private_auth_tag, created_at, updated_at
         FROM applications
         WHERE id = $1`,
        [id]
      );
      return rows[0] || null;
    },

    async review(id, status, reviewerId, publicProfile = null) {
      const client = await getPool().connect();
      try {
        await client.query('BEGIN');
        const selected = await client.query(
          'SELECT status FROM applications WHERE id = $1 FOR UPDATE',
          [id]
        );
        if (!selected.rows.length) {
          await client.query('ROLLBACK');
          return null;
        }

        const previousStatus = selected.rows[0].status;
        const transitions = {
          submitted: ['in_review'],
          in_review: ['verified', 'rejected'],
          rejected: ['in_review'],
          verified: ['in_review'],
        };
        if (!transitions[previousStatus]?.includes(status)) {
          await client.query('ROLLBACK');
          return { conflict: true, status: previousStatus };
        }

        const updated = await client.query(
          `UPDATE applications
           SET status = $2,
               public_name = $3,
               public_summary = $4,
               xrpl_account = $5,
               updated_at = NOW()
           WHERE id = $1
           RETURNING id, kind, public_name, status, updated_at`,
          [
            id,
            status,
            publicProfile?.name || '',
            publicProfile?.summary || '',
            publicProfile?.account || null,
          ]
        );
        await client.query(
          `INSERT INTO application_status_events
             (application_id, from_status, to_status, reviewer_id)
           VALUES ($1, $2, $3, $4)`,
          [id, previousStatus, status, reviewerId]
        );
        await client.query('COMMIT');
        return updated.rows[0];
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            'Application review and rollback both failed.'
          );
        }
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

module.exports = { createApplicationStore };
