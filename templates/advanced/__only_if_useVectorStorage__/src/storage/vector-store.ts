/**
 * Vector storage hook — stub scaffolded by `rune new --vector-storage`.
 *
 * The framework's `vectorStorage` runtime (`@mcp-rune/mcp-rune/runtime`)
 * exposes `isVectorStorageEnabled()` plus the lifecycle hooks tools rely on.
 * Wire your concrete provider (Postgres pgvector, Qdrant, Pinecone, …) in
 * `enableVectorStorage` below, then call it from `src/config.ts` during
 * startup so `ToolRegistry` picks it up via `vectorStorageEnabled`.
 */

import { vectorStorage } from '@mcp-rune/mcp-rune/runtime'

export interface VectorStoreConfig {
  url?: string
  apiKey?: string
}

export function enableVectorStorage(_config: VectorStoreConfig = {}): void {
  // TODO: register your provider with the framework's vector storage service.
  // Example: `vectorStorage.configure({ provider: new PgVectorProvider(_config) })`
  //
  // After configuration, `vectorStorage.isVectorStorageEnabled()` should
  // return true so tools tagged `requiresVectorStorage` light up.
  void vectorStorage
}
