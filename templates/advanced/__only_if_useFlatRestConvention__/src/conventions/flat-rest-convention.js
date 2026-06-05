/**
 * Flat REST convention — starter scaffolded by `rune new --api-convention rest-flat`.
 *
 * Targets plain REST APIs that accept and return resources without a JSON:API
 * `data: { attributes: ... }` envelope. Customize for your backend's exact
 * shape (pagination, association style, error envelope).
 */

import { BaseConvention } from '@mcp-rune/mcp-rune/api-conventions';

export class FlatRestConvention extends BaseConvention {
  get name() {
    return 'rest-flat';
  }

  resolveAssociationFields(relName, relConfig, overrides = {}) {
    const isMany = Boolean(relConfig.many);
    const fieldName = isMany ? `${singularize(relName)}_ids` : `${relName}_id`;
    const field = {
      name: fieldName,
      type: isMany ? 'array' : 'integer',
      required: Boolean(relConfig.required),
      description: relConfig.description ?? `Association to ${relConfig.target_model}`,
      ...overrides[fieldName],
    };
    if (isMany) field.items = { type: 'integer' };
    return { [fieldName]: field };
  }

  resolveAssociationValues(attrs) {
    return { ...attrs };
  }

  buildRequestPayload(_model, attrs) {
    return { ...attrs };
  }

  normalizeListResponse(response, { page, perPage }) {
    const records = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.records)
          ? response.records
          : [];
    const total = typeof response?.total === 'number' ? response.total : records.length;
    return {
      records,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  }

  cleanResponse(data) {
    return data;
  }
}

function singularize(name) {
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y';
  if (name.endsWith('s')) return name.slice(0, -1);
  return name;
}

export const flatRestConvention = new FlatRestConvention();
