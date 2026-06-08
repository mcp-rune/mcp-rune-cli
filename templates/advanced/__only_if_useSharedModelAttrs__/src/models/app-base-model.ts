/**
 * Shared ModelLayer base — stub scaffolded by `rune new --shared-model-attrs`.
 *
 * Intermediate class between the framework's `BaseModel` and the per-resource
 * models in `src/models/`. Put attributes / methods that apply across every
 * model here (e.g. tenancy keys, audit timestamps, soft-delete fields) so
 * each concrete model only declares what's unique to it.
 *
 * Scaffolded models still extend `BaseModel` directly today; switch their
 * `extends` to `AppBaseModel` to pick this up.
 */

import type { AttributeDefinition } from '@mcp-rune/mcp-rune/models'
import { BaseModel } from '@mcp-rune/mcp-rune/models'

export class AppBaseModel extends BaseModel {
  static override attributes: Record<string, AttributeDefinition> = {
    // TODO: shared attributes, e.g.:
    // created_at: { type: 'datetime', description: 'Created at' },
    // updated_at: { type: 'datetime', description: 'Updated at' },
  }
}
