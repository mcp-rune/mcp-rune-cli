/**
 * FetchApiClient — starter scaffolded by `rune new --api-client fetch`.
 *
 * Implements the framework's `ApiClient` interface using native `fetch` (Node 18+).
 * Returns `Promise<Record<string, unknown>>` from each verb. Adapt the
 * convention hook and error parsing for your backend's wire format.
 */

export class FetchApiClient {
  constructor({ baseUrl, accessToken, convention, fetchImpl = globalThis.fetch }) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
    this.convention = convention;
    this._fetch = fetchImpl;
  }

  async get(url, params, _options) {
    return this._request('GET', url, { params });
  }

  async post(url, data, _options) {
    return this._request('POST', url, { body: data });
  }

  async put(url, data, _options) {
    return this._request('PUT', url, { body: data });
  }

  async patch(url, data, _options) {
    return this._request('PATCH', url, { body: data });
  }

  async delete(url, _options) {
    return this._request('DELETE', url);
  }

  async _request(method, url, { params, body } = {}) {
    const target = new URL(this._resolveUrl(url));
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        target.searchParams.set(k, String(v));
      }
    }

    const headers = { Accept: 'application/json' };
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;

    const init = { method, headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const response = await this._fetch(target, init);
    const text = await response.text();
    const payload = text ? safeJson(text) : {};

    if (!response.ok) {
      const messages = this.convention?.parseErrorResponse?.({
        status: response.status,
        data: payload,
      }) ?? [text || `HTTP ${response.status}`];
      const err = new Error(messages.join('; '));
      err.status = response.status;
      err.body = payload;
      throw err;
    }

    return this.convention?.cleanResponse
      ? this.convention.cleanResponse(payload)
      : payload;
  }

  _resolveUrl(url) {
    if (/^https?:\/\//i.test(url)) return url;
    const base = this.baseUrl?.replace(/\/$/, '') ?? '';
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
