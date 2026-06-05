/**
 * Ransack search adapter — starter scaffolded by
 * `rune new --search-adapter ransack`.
 *
 * Targets Rails backends using the Ransack gem, which expects filters under a
 * single `q` parameter using `field_predicate` suffixes (e.g. `q[name_eq]`,
 * `q[created_at_gt]`). Customize as your search endpoint requires.
 */

import { SearchAdapter } from '@mcp-rune/mcp-rune/api-extensions/search'

interface Pagination {
  page: number
  perPage: number
}

interface SearchConfig {
  query?: { queryParam?: string; expand?: string[] }
}

export class RansackSearchAdapter extends SearchAdapter {
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
