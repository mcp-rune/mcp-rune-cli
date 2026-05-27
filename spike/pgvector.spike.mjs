// Spike: same fixture against pgvector for parity comparison.
import pg from 'pg';
import { ITEMS, QUERY, TOP_K, DIM_EXPORT as DIM } from './fixture.mjs';

const t0 = performance.now();

const client = new pg.Client({
  host: 'localhost',
  port: 5432,
  database: 'vector_spike',
});
await client.connect();

const ver = await client.query("SELECT extversion FROM pg_extension WHERE extname='vector'");
console.log(`pgvector version: ${ver.rows[0]?.extversion ?? 'not installed'}`);

await client.query('DROP TABLE IF EXISTS items');
await client.query(`
  CREATE TABLE items (
    id INTEGER PRIMARY KEY,
    embedding vector(${DIM})
  )
`);

function toPgVec(arr) {
  return '[' + Array.from(arr).join(',') + ']';
}

const tInsertStart = performance.now();
await client.query('BEGIN');
for (const r of ITEMS) {
  await client.query('INSERT INTO items(id, embedding) VALUES ($1, $2)', [r.id, toPgVec(r.embedding)]);
}
await client.query('COMMIT');
const tInsertMs = performance.now() - tInsertStart;

const tQueryStart = performance.now();
const res = await client.query(
  `SELECT id, embedding <=> $1 AS distance
     FROM items
    ORDER BY embedding <=> $1
    LIMIT $2`,
  [toPgVec(QUERY), TOP_K]
);
const tQueryMs = performance.now() - tQueryStart;

const total = performance.now() - t0;

const rows = res.rows.map(r => ({ id: r.id, distance: Number(r.distance) }));
console.log(`inserted ${ITEMS.length} rows in ${tInsertMs.toFixed(1)}ms`);
console.log(`top-${TOP_K} query in ${tQueryMs.toFixed(2)}ms`);
console.log('result ids:', rows.map(r => r.id).join(','));
console.log('result distances:', rows.map(r => r.distance.toFixed(6)).join(','));
console.log(`total: ${total.toFixed(1)}ms`);

await client.end();

import { writeFileSync } from 'node:fs';
writeFileSync(
  new URL('./pgvector.results.json', import.meta.url),
  JSON.stringify({
    backend: 'pgvector',
    version: ver.rows[0]?.extversion,
    rows,
    timings: { insertMs: tInsertMs, queryMs: tQueryMs, totalMs: total },
  }, null, 2)
);
