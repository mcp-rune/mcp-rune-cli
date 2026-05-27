// Confirm sqlite-vec supports cosine distance explicitly (matches pgvector's <=> semantics).
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { ITEMS, QUERY, TOP_K, DIM_EXPORT as DIM } from './fixture.mjs';

const db = new Database(':memory:');
sqliteVec.load(db);

db.exec(`
  CREATE VIRTUAL TABLE items USING vec0(
    id INTEGER PRIMARY KEY,
    embedding float[${DIM}] distance_metric=cosine
  );
`);

const insert = db.prepare('INSERT INTO items(id, embedding) VALUES (?, ?)');
const insertMany = db.transaction((rows) => {
  for (const r of rows) insert.run(BigInt(r.id), Buffer.from(r.embedding.buffer));
});
insertMany(ITEMS);

const rows = db.prepare(`
  SELECT id, distance FROM items
  WHERE embedding MATCH ? AND k = ?
  ORDER BY distance
`).all(Buffer.from(QUERY.buffer), TOP_K);

console.log('cosine distance_metric ids: ', rows.map(r => r.id).join(','));
console.log('cosine distances:           ', rows.map(r => r.distance.toFixed(6)).join(','));
console.log('expected (pgvector <=>):    ', '195,119,23,145,103,105,15,41,91,117');
console.log('expected distances:         ', '0.891812,0.905431,0.912574,0.919000,0.921058,0.921427,0.926538,0.926854,0.933754,0.935421');
