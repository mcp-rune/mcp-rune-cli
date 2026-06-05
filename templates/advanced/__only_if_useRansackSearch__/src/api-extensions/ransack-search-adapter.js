/**
 * Ransack search adapter — starter scaffolded by
 * `rune new --search-adapter ransack`.
 *
 * Targets Rails backends using the Ransack gem, which expects filters under a
 * single `q` parameter using `field_predicate` suffixes (e.g. `q[name_eq]`,
 * `q[created_at_gt]`). Customize as your search endpoint requires.
 */

import { SearchAdapter } from '@mcp-rune/mcp-rune/api-extensions/search';

export class RansackSearchAdapter extends SearchAdapter {
  buildBody(query, filters, { page, perPage }, searchConfig) {
    const body = { page, per_page: perPage };

    const q = filters && Object.keys(filters).length > 0 ? { ...filters } : {};

    if (query) {
      const queryField = searchConfig?.query?.queryParam || 'name_cont';
      q[queryField] = query;
    }

    if (Object.keys(q).length > 0) body.q = q;
    return body;
  }
}

export const ransackSearchAdapter = new RansackSearchAdapter();
