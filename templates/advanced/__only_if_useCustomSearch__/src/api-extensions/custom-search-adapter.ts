/**
 * Custom search request shaper — stub scaffolded by `rune new --search-adapter custom`.
 *
 * Extend `SearchRequestShaper` and override `buildBody` to translate the
 * framework's `(query, filters, pagination, config)` shape into your search
 * endpoint's wire format (POST body, GET params, GraphQL query, etc.).
 *
 * Wire it into the search api-extension at the ToolRegistry construction
 * site (see `src/tools/index.ts` `searchExtension({ shaper: customSearchAdapter })`).
 */

import { SearchRequestShaper } from '@mcp-rune/mcp-rune/api-extensions/search'
import type { Pagination, SearchConfig } from '@mcp-rune/mcp-rune/api-extensions/search'

export class CustomSearchAdapter extends SearchRequestShaper {
  override buildBody(
    query: string | null,
    filters: Record<string, unknown> | undefined,
    { page, perPage }: Pagination,
    _searchConfig: SearchConfig
  ): Record<string, unknown> {
    // TODO: shape the body for your search endpoint.
    const body: Record<string, unknown> = { page, per_page: perPage }
    if (query) body.q = query
    if (filters && Object.keys(filters).length > 0) body.filters = filters
    return body
  }
}

export const customSearchAdapter = new CustomSearchAdapter()
