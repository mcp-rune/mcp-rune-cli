/**
 * Custom convention — stub scaffolded by `rune new --api-convention custom`.
 *
 * Extend `BaseConvention` to describe how your backend's wire format maps
 * onto the framework's normalized shape. Fill in the three override hooks
 * for your API: association field naming, list-response normalization,
 * and response cleaning.
 */

import type {
  FieldDefinition,
  NormalizedListResponse
} from '@mcp-rune/mcp-rune/api-conventions'
import { BaseConvention } from '@mcp-rune/mcp-rune/api-conventions'
import type { BelongsToAssociation, HasManyAssociation } from '@mcp-rune/mcp-rune/models'

export class CustomConvention extends BaseConvention {
  override get name(): string {
    return 'custom'
  }

  override resolveAssociationFields(
    relName: string,
    relConfig: BelongsToAssociation | HasManyAssociation,
    overrides: Record<string, Partial<FieldDefinition>> = {}
  ): Record<string, FieldDefinition> {
    // TODO: shape this for your backend (e.g. embedded objects, foreign keys,
    // or a `relationships: {}` envelope).
    const isMany = 'many' in relConfig && Boolean(relConfig.many)
    const fieldName = isMany ? `${relName}` : `${relName}_id`
    const field: FieldDefinition = {
      name: fieldName,
      type: isMany ? 'array' : 'integer',
      required: Boolean(relConfig.required),
      description: relConfig.description ?? `Association to ${relConfig.target_model}`,
      ...overrides[fieldName]
    }
    return { [fieldName]: field }
  }

  override normalizeListResponse(
    response: Record<string, unknown> | unknown[],
    { page, perPage }: { page: number; perPage: number }
  ): NormalizedListResponse {
    // TODO: pull records + pagination metadata out of your envelope.
    const records = Array.isArray(response) ? (response as Record<string, unknown>[]) : []
    return {
      records,
      pagination: {
        page,
        per_page: perPage,
        total: records.length,
        total_pages: 1
      }
    }
  }

  override cleanResponse(data: unknown): unknown {
    // TODO: strip metadata wrappers; default is identity.
    return data
  }
}

export const customConvention = new CustomConvention()
