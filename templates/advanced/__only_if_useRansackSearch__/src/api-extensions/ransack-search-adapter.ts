/**
 * Ransack search request shaper — starter scaffolded by
 * `rune new --search-adapter ransack`.
 *
 * Rails backends using the Ransack gem expect filters under a single `q`
 * parameter with `field_predicate` suffixes (e.g. `q[name_eq]`,
 * `q[created_at_gt]`). This subclass of the framework's
 * `SearchRequestShaper` builds that envelope; tweak the predicate logic for
 * your endpoint as needed.
 *
 * For complete Rails coverage (filter nesting + range mappings) consider
 * `RailsSearchRequestShaper` from `@mcp-rune/mcp-rune/api-extensions/search`
 * instead.
 */

import { SearchRequestShaper } from '@mcp-rune/mcp-rune/api-extensions/search'
import type { Pagination, SearchConfig } from '@mcp-rune/mcp-rune/api-extensions/search'

export class RansackSearchAdapter extends SearchRequestShaper {
  override buildBody(
    query: string | null,
    filters: Record<string, unknown> | undefined,
    { page, perPage }: Pagination,
    searchConfig: SearchConfig
  ): Record<string, unknown> {
    const body: Record<string, unknown> = { page, per_page: perPage }

    const q: Record<string, unknown> =
      filters && Object.keys(filters).length > 0 ? { ...filters } : {}

    if (query) {
      const queryField = searchConfig?.query?.queryParam ?? 'name_cont'
      q[queryField] = query
    }

    if (Object.keys(q).length > 0) body.q = q
    return body
  }
}

export const ransackSearchAdapter = new RansackSearchAdapter()
