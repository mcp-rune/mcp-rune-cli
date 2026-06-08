/**
 * Flat REST convention — starter scaffolded by `rune new --api-convention rest-flat`.
 *
 * Targets plain REST APIs that accept and return resources without a JSON:API
 * `data: { attributes: ... }` envelope. Customize for your backend's exact
 * shape (pagination, association style, error envelope).
 */

import type {
  FieldDefinition,
  NormalizedListResponse
} from '@mcp-rune/mcp-rune/api-conventions'
import { BaseConvention } from '@mcp-rune/mcp-rune/api-conventions'
import type { BelongsToAssociation, HasManyAssociation } from '@mcp-rune/mcp-rune/models'

export class FlatRestConvention extends BaseConvention {
  override get name(): string {
    return 'rest-flat'
  }

  override resolveAssociationFields(
    relName: string,
    relConfig: BelongsToAssociation | HasManyAssociation,
    overrides: Record<string, Partial<FieldDefinition>> = {}
  ): Record<string, FieldDefinition> {
    const isMany = 'many' in relConfig && Boolean(relConfig.many)
    const fieldName = isMany ? `${singularize(relName)}_ids` : `${relName}_id`
    const field: FieldDefinition = {
      name: fieldName,
      type: isMany ? 'array' : 'integer',
      required: Boolean(relConfig.required),
      description: relConfig.description ?? `Association to ${relConfig.target_model}`,
      ...overrides[fieldName]
    }
    if (isMany) field.items = { type: 'integer' }
    return { [fieldName]: field }
  }

  override normalizeListResponse(
    response: Record<string, unknown> | unknown[],
    { page, perPage }: { page: number; perPage: number }
  ): NormalizedListResponse {
    const records = pickRecords(response)
    const total = pickTotal(response, records.length)
    return {
      records,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.max(1, Math.ceil(total / perPage))
      }
    }
  }

  override cleanResponse(data: unknown): unknown {
    return data
  }
}

function singularize(name: string): string {
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y'
  if (name.endsWith('s')) return name.slice(0, -1)
  return name
}

function pickRecords(response: unknown): Record<string, unknown>[] {
  if (Array.isArray(response)) return response as Record<string, unknown>[]
  if (response && typeof response === 'object') {
    const r = response as { data?: unknown; records?: unknown }
    if (Array.isArray(r.data)) return r.data as Record<string, unknown>[]
    if (Array.isArray(r.records)) return r.records as Record<string, unknown>[]
  }
  return []
}

function pickTotal(response: unknown, fallback: number): number {
  if (response && typeof response === 'object') {
    const r = response as { total?: unknown }
    if (typeof r.total === 'number') return r.total
  }
  return fallback
}

export const flatRestConvention = new FlatRestConvention()
