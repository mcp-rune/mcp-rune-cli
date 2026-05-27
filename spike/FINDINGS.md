# Vector Backend Spike — Findings

Validates the two candidate approaches for the analysis module's storage backend in mcp-rune. Both routes were exercised end-to-end against the same 200-row, 384-dim, L2-normalized fixture (`fixture.mjs`) using the same query vector.

## Results

### Technical parity (sqlite-vec vs pgvector)

Both backends return identical top-10 results in identical order.

| Metric | sqlite-vec 0.1.9 | pgvector 0.8.1 |
|---|---|---|
| Top-10 IDs | `195,119,23,145,103,105,15,41,91,117` | `195,119,23,145,103,105,15,41,91,117` |
| Top-10 cosine distances | `0.891812 … 0.935422` | `0.891812 … 0.935421` |
| Order match | ✅ | ✅ |
| Distance match | 6 decimal places (last bit float rounding) | — |

Setup parity: sqlite-vec's `CREATE VIRTUAL TABLE … USING vec0(embedding float[384] distance_metric=cosine)` produces the same semantics as pgvector's `<=>` operator. With `distance_metric` defaulted to L2, ordering still matches on normalized vectors (L2 ranking = cosine ranking) but absolute distances differ — explicit `distance_metric=cosine` keeps the value semantics identical too.

Gotcha: better-sqlite3 + vec0 requires `BigInt` for primary-key bindings (`Number` values are rejected with `"Only integers are allows for primary key values"`). One-line fix per insert.

### Ergonomics

| Aspect | sqlite-vec | Docker pgvector |
|---|---|---|
| First-run install | `npm install` (~25s, prebuilt `.dylib` shipped, no compile) | `docker compose pull` (~30s, 640 MB image) |
| Cold boot | instant (in-process) | 8s |
| Warm restart | instant | 2s |
| Idle RAM | 0 (in-process) | 21 MiB |
| node_modules impact | +30 MB (27 MB is better-sqlite3 itself) | 0 |
| Production parity | different DB from prod | same DB as prod |
| Concurrent writes | single writer (SQLite limit) | full concurrency |
| Cross-platform | prebuilt binaries for mac/linux/win | Docker available everywhere |
| Code changes in mcp-rune | 2–3 weeks (new vendor, new migrations, JS-side fallbacks for `date_bin`) | **zero** |
| Maintenance going forward | +1 backend (parameterized test suite, parity guarantee) | 0 |

## Recommendation: pivot to Docker pgvector

mcp-rune is already a Postgres-y framework — OAuth token storage uses Postgres regardless of whether analysis is enabled. Forcing a second backend just to avoid a Docker dependency isn't a clean win:

1. **Zero refactor cost.** Workstream A in the plan disappears.
2. **Production parity.** engineer-mcp uses real Postgres in prod; dev should too.
3. **2s warm restart, 21 MiB idle RAM.** The cost of running Postgres locally is much smaller than feared.
4. **Frees 2–3 weeks** to spend on CLI polish instead.

The sqlite-vec spike is preserved here as a future escape hatch if Docker ever becomes a blocker (e.g., corporate environments where Docker Desktop isn't allowed). The technical feasibility is proven; if we need it later, it's a known-viable port.

## Plan revision

- **Drop Workstream A** (sqlite-vec backend) from the critical path. Keep it in the follow-up list as a "if we ever need it" item.
- **Workstream B** ships with a `docker-compose.yml` template for the Advanced preset's analysis path.
  - Template content matches `spike/docker-compose.yml` (pgvector/pgvector:pg16, port mapping, healthcheck, named volume).
  - `rune doctor` adds a check: `docker info` reachable when `ANALYSIS_ENABLED=true`.
  - `rune db up` shells out to `docker compose exec db psql` to run migrations, or just runs them via the node `pg` client against the exposed port.
- **mcp-rune follow-up** (non-blocking): ship a reference `docker-compose.example.yml` under `docs/examples/` so users not using the CLI also benefit.
- Net scope reduction: ~3 weeks. CLI v1 becomes implementable in 1 focused session.

## Files

- `package.json`, `fixture.mjs` — shared
- `sqlite-vec.spike.mjs` — sqlite-vec end-to-end run
- `pgvector.spike.mjs` — pgvector end-to-end run (against local Postgres on :5432, db `vector_spike`)
- `sqlite-cosine.spike.mjs` — confirms `distance_metric=cosine` reaches numeric parity with pgvector's `<=>`
- `parity.spike.mjs` — diff harness comparing both result sets
- `docker-compose.yml` — minimal pgvector compose; reference for CLI's Advanced-preset template
- `sqlite-vec.results.json`, `pgvector.results.json` — raw outputs
