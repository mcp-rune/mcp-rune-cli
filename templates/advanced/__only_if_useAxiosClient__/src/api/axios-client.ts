/**
 * AxiosApiClient — starter scaffolded by `rune new --api-client axios`.
 *
 * Implements the framework's `ApiClient` interface on top of axios. Adapt the
 * convention hook and error parsing for your backend's wire format.
 */

import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import type { BaseConvention } from '@mcp-rune/mcp-rune/api-conventions'
import type { ApiClient } from '@mcp-rune/mcp-rune/core'

interface AxiosApiClientOptions {
  baseUrl: string
  accessToken?: string
  convention?: BaseConvention
}

interface HttpError extends Error {
  status?: number
  body?: unknown
}

export class AxiosApiClient implements ApiClient {
  private client: AxiosInstance
  private convention?: BaseConvention

  constructor({ baseUrl, accessToken, convention }: AxiosApiClientOptions) {
    this.convention = convention
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      }
    })
  }

  async get(url: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this._unwrap(this.client.get(url, { params }))
  }

  async post(url: string, data?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this._unwrap(this.client.post(url, data))
  }

  async put(url: string, data?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this._unwrap(this.client.put(url, data))
  }

  async patch(url: string, data?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this._unwrap(this.client.patch(url, data))
  }

  async delete(url: string): Promise<Record<string, unknown>> {
    return this._unwrap(this.client.delete(url))
  }

  private async _unwrap(p: Promise<AxiosResponse>): Promise<Record<string, unknown>> {
    try {
      const response = await p
      return (response.data ?? {}) as Record<string, unknown>
    } catch (raw) {
      const err = raw as { response?: { status?: number; data?: unknown }; message?: string }
      const messages = this.convention?.parseErrorResponse?.({
        status: err.response?.status ?? 0,
        data: err.response?.data
      }) ?? [err.message ?? 'HTTP error']
      const out: HttpError = new Error(messages.join('; '))
      out.status = err.response?.status
      out.body = err.response?.data
      throw out
    }
  }
}
