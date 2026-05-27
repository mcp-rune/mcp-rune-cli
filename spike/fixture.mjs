// Shared fixture: deterministic 384-dim normalized vectors + query.
// Used by both sqlite-vec and pgvector spikes for parity comparison.

const DIM = 384;
const N = 200;

// Seeded PRNG (mulberry32) for reproducibility.
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randomVec(rand) {
  // Box-Muller for ~normal distribution, then L2-normalize (matches embedding output shape).
  const v = new Float32Array(DIM);
  for (let i = 0; i < DIM; i += 2) {
    const u1 = Math.max(rand(), 1e-12);
    const u2 = rand();
    const mag = Math.sqrt(-2 * Math.log(u1));
    v[i] = mag * Math.cos(2 * Math.PI * u2);
    if (i + 1 < DIM) v[i + 1] = mag * Math.sin(2 * Math.PI * u2);
  }
  let norm = 0;
  for (let i = 0; i < DIM; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < DIM; i++) v[i] /= norm;
  return v;
}

const rand = rng(42);
export const ITEMS = Array.from({ length: N }, (_, i) => ({
  id: i + 1,
  embedding: randomVec(rand),
}));
export const QUERY = randomVec(rand);
export const TOP_K = 10;
export const DIM_EXPORT = DIM;
