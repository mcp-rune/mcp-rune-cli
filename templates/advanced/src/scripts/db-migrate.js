#!/usr/bin/env node
/**
 * Apply mcp-rune database migrations against DATABASE_URL.
 * Tracks applied migrations in a schema_migrations table.
 */
import { resolve } from 'node:path';
import pg from 'pg';
import { migrations } from '@mcp-rune/mcp-rune/db/migrations';

function maskUrl(url) {
  try {
    const u = new URL(url);
    if (u.username || u.password) { u.username = '***'; u.password = ''; }
    return u.toString().replace(/\/$/, '');
  } catch { return '***'; }
}

function loadEnv() {
  try { process.loadEnvFile(resolve('.env')); } catch { /* optional */ }
}

async function migrate() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('DATABASE_URL not set — skipping');
    return;
  }
  console.log(`Connecting to ${maskUrl(url)} …`);
  const pool = new pg.Pool({ connectionString: url });
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      const { rows } = await client.query(`SELECT version FROM schema_migrations`);
      const applied = new Set(rows.map((r) => r.version));
      let count = 0;
      for (const m of migrations) {
        if (applied.has(m.version)) {
          console.log(`  skip ${m.version}_${m.name}`);
          continue;
        }
        console.log(`  apply ${m.version}_${m.name}`);
        await client.query('BEGIN');
        try {
          await client.query(m.up);
          await client.query(
            `INSERT INTO schema_migrations (version, name) VALUES ($1, $2)`,
            [m.version, m.name],
          );
          await client.query('COMMIT');
          count++;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }
      console.log(count === 0 ? 'All migrations already applied.' : `Applied ${count} migration(s).`);
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(`Migration failed: ${err.message}`);
  process.exit(1);
});
