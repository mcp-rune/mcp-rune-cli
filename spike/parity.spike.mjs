// Compare top-K results from sqlite-vec vs pgvector spike outputs.
import { readFileSync } from 'node:fs';

const sq = JSON.parse(readFileSync(new URL('./sqlite-vec.results.json', import.meta.url)));
const pg = JSON.parse(readFileSync(new URL('./pgvector.results.json', import.meta.url)));

console.log('=== Parity check ===');
console.log(`sqlite-vec v${sq.version} vs pgvector v${pg.version}`);
console.log();

const sqIds = sq.rows.map(r => r.id);
const pgIds = pg.rows.map(r => r.id);
console.log('sqlite-vec ids:', sqIds.join(','));
console.log('pgvector   ids:', pgIds.join(','));

const orderMatch = sqIds.join(',') === pgIds.join(',');
const setMatch = new Set(sqIds).size === sqIds.length
  && sqIds.every(id => pgIds.includes(id));

console.log();
console.log(`order match: ${orderMatch ? 'YES' : 'NO'}`);
console.log(`set match:   ${setMatch ? 'YES' : 'NO'}`);

if (!orderMatch || !setMatch) {
  console.log();
  console.log('detail:');
  for (let i = 0; i < Math.max(sqIds.length, pgIds.length); i++) {
    const sqRow = sq.rows[i];
    const pgRow = pg.rows[i];
    const match = sqRow?.id === pgRow?.id ? '  ' : '!!';
    console.log(
      `  ${match} #${i + 1}  sqlite-vec id=${sqRow?.id} d=${sqRow?.distance.toFixed(6)}` +
      `  |  pgvector id=${pgRow?.id} d=${pgRow?.distance.toFixed(6)}`
    );
  }
}

console.log();
console.log('=== Timings ===');
console.log(`sqlite-vec: insert ${sq.timings.insertMs.toFixed(1)}ms, query ${sq.timings.queryMs.toFixed(2)}ms`);
console.log(`pgvector:   insert ${pg.timings.insertMs.toFixed(1)}ms, query ${pg.timings.queryMs.toFixed(2)}ms`);

process.exit(orderMatch && setMatch ? 0 : 1);
