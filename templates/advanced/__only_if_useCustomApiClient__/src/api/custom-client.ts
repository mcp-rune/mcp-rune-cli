/**
 * Custom ApiClient stub — scaffolded by `rune new --api-client custom`.
 *
 * Implement the framework's `ApiClient` interface against whatever HTTP layer
 * (got, undici, your own pool) your backend needs. Each verb must return
 * `Promise<Record<string, unknown>>` parsed from the response body.
 */

import type { BaseConvention } from '@mcp-rune/mcp-rune/api-conventions'
import type { ApiClient } from '@mcp-rune/mcp-rune/core'

interface CustomApiClientOptions {
  baseUrl: string
  accessToken?: string
  convention?: BaseConvention
}

export class CustomApiClient implements ApiClient {
  baseUrl: string
  protected accessToken?: string
  protected convention?: BaseConvention

  constructor({ baseUrl, accessToken, convention }: CustomApiClientOptions) {
    this.baseUrl = baseUrl
    this.accessToken = accessToken
    this.convention = convention
  }

  async get(_url: string, _params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error('CustomApiClient.get: TODO implement')
  }

  async post(_url: string, _data?: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error('CustomApiClient.post: TODO implement')
  }

  async put(_url: string, _data?: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error('CustomApiClient.put: TODO implement')
  }

  async patch(_url: string, _data?: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error('CustomApiClient.patch: TODO implement')
  }

  async delete(_url: string): Promise<Record<string, unknown>> {
    throw new Error('CustomApiClient.delete: TODO implement')
  }
}
