/**
 * FetchApiClient — starter scaffolded by `rune new --api-client fetch`.
 *
 * Implements the framework's `ApiClient` interface using native `fetch` (Node 18+).
 * Returns `Promise<Record<string, unknown>>` from each verb. Adapt the
 * convention hook and error parsing for your backend's wire format.
 */

import type { BaseConvention } from '@mcp-rune/mcp-rune/api-conventions'
import type { ApiClient } from '@mcp-rune/mcp-rune/core'

interface FetchApiClientOptions {
  baseUrl: string
  accessToken?: string
  convention?: BaseConvention
  fetchImpl?: typeof fetch
}

interface HttpError extends Error {
  status?: number
  body?: unknown
}

export class FetchApiClient implements ApiClient {
  private baseUrl: string
  private accessToken?: string
  private convention?: BaseConvention
  private _fetch: typeof fetch

  constructor({ baseUrl, accessToken, convention, fetchImpl = globalThis.fetch }: FetchApiClientOptions) {
    this.baseUrl = baseUrl
    this.accessToken = accessToken
    this.convention = convention
    this._fetch = fetchImpl
  }

  async get(url: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this._request('GET', url, { params })
  }

  async post(url: string, data?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this._request('POST', url, { body: data })
  }

  async put(url: string, data?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this._request('PUT', url, { body: data })
  }

  async patch(url: string, data?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this._request('PATCH', url, { body: data })
  }

  async delete(url: string): Promise<Record<string, unknown>> {
    return this._request('DELETE', url)
  }

  private async _request(
    method: string,
    url: string,
    { params, body }: { params?: Record<string, unknown>; body?: unknown } = {}
  ): Promise<Record<string, unknown>> {
    const target = new URL(this._resolveUrl(url))
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue
        target.searchParams.set(k, String(v))
      }
    }

    const headers: Record<string, string> = { Accept: 'application/json' }
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`

    const init: RequestInit = { method, headers }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }

    const response = await this._fetch(target, init)
    const text = await response.text()
    const payload = text ? safeJson(text) : {}

    if (!response.ok) {
      const messages = this.convention?.parseErrorResponse?.({
        status: response.status,
        data: payload
      }) ?? [text || `HTTP ${response.status}`]
      const err: HttpError = new Error(messages.join('; '))
      err.status = response.status
      err.body = payload
      throw err
    }

    return payload as Record<string, unknown>
  }

  private _resolveUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) return url
    const base = this.baseUrl?.replace(/\/$/, '') ?? ''
    const path = url.startsWith('/') ? url : `/${url}`
    return `${base}${path}`
  }
}

function safeJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return { raw: text }
  }
}
