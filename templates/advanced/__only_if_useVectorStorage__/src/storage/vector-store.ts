/**
 * Vector storage — scaffolded by `rune new --vector-storage`.
 *
 * Call `enableVectorStorage(pool)` once at server startup (before ToolRegistry
 * is constructed). Tools tagged `requiresVectorStorage` only appear in
 * `tools/list` after this call succeeds.
 *
 * Retention options can be tuned via `createPgvectorAdapter` options:
 *   toolMemoriesRetentionDays (default 30)
 *   ingestedRecordsRetentionDays (default 7)
 */

import type { Pool } from 'pg'
import { vectorStorage } from '@mcp-rune/mcp-rune/runtime'
import { createPgvectorAdapter } from '@mcp-rune/mcp-rune/runtime/vendor/pgvector'

export function enableVectorStorage(pool: Pool): void {
  vectorStorage.initVectorStorage({
    adapter: createPgvectorAdapter({ pool }),
  })
}
