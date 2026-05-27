// Spike: confirm sqlite-vec loads, vec0 virtual table works, MATCH k=N returns sorted top-K.
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { ITEMS, QUERY, TOP_K, DIM_EXPORT as DIM } from './fixture.mjs';

const t0 = performance.now();

const db = new Database(':memory:');
sqliteVec.load(db);

const ver = db.prepare('SELECT vec_version() AS v').get();
console.log(`sqlite-vec version: ${ver.v}`);

db.exec(`
  CREATE VIRTUAL TABLE items USING vec0(
    id INTEGER PRIMARY KEY,
    embedding float[${DIM}]
  );
`);

const insert = db.prepare('INSERT INTO items(id, embedding) VALUES (?, ?)');
const insertMany = db.transaction((rows) => {
  for (const r of rows) insert.run(BigInt(r.id), Buffer.from(r.embedding.buffer));
});
const tInsertStart = performance.now();
insertMany(ITEMS);
const tInsertMs = performance.now() - tInsertStart;

const tQueryStart = performance.now();
const rows = db.prepare(`
  SELECT id, distance
  FROM items
  WHERE embedding MATCH ? AND k = ?
  ORDER BY distance
`).all(Buffer.from(QUERY.buffer), TOP_K);
const tQueryMs = performance.now() - tQueryStart;

const total = performance.now() - t0;

console.log(`inserted ${ITEMS.length} rows in ${tInsertMs.toFixed(1)}ms`);
console.log(`top-${TOP_K} query in ${tQueryMs.toFixed(2)}ms`);
console.log('result ids:', rows.map(r => r.id).join(','));
console.log('result distances:', rows.map(r => r.distance.toFixed(6)).join(','));
console.log(`total: ${total.toFixed(1)}ms`);

// Export results for parity comparison.
import { writeFileSync } from 'node:fs';
writeFileSync(
  new URL('./sqlite-vec.results.json', import.meta.url),
  JSON.stringify({
    backend: 'sqlite-vec',
    version: ver.v,
    rows: rows.map(r => ({ id: r.id, distance: r.distance })),
    timings: { insertMs: tInsertMs, queryMs: tQueryMs, totalMs: total },
  }, null, 2)
);
