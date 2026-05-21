import { TheazoError, type TheazoErrorCode } from './errors.js'

export interface HttpClientConfig {
  baseUrl: string
  apiKey: string
}

interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  requestId?: string
}

export class HttpClient {
  private baseUrl: string
  private apiKey: string

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.apiKey = config.apiKey
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-SDK-Version': '0.1.0',
    }
  }

  async request<T>(
    method: string,
    path: string,
    opts?: { body?: unknown; query?: Record<string, string | number | boolean | undefined>; timeout?: number }
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`

    if (opts?.query) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(opts.query)) {
        if (value !== undefined) {
          params.set(key, String(value))
        }
      }
      const qs = params.toString()
      if (qs) url += `?${qs}`
    }

    const controller = new AbortController()
    const timeoutMs = opts?.timeout ?? 30_000
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    let response: Response
    try {
      response = await this.fetchWithRetry(url, {
        method,
        headers: this.headers(),
        body: opts?.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      })
    } catch (err) {
      if (err instanceof TheazoError) throw err
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new TheazoError({
          code: 'timeout',
          message: `Request timed out after ${timeoutMs}ms`,
          status: 0,
        })
      }
      throw new TheazoError({
        code: 'connection_error',
        message: err instanceof Error ? err.message : 'Connection failed',
        status: 0,
      })
    } finally {
      clearTimeout(timer)
    }

    if (!response.ok) {
      await this.handleErrorResponse(response)
    }

    if (response.status === 204) return undefined as T

    const text = await response.text()
    return text ? (JSON.parse(text) as T) : (undefined as T)
  }

  async get<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', path, { query })
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body })
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, { body })
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, { body })
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }

  async *stream<T>(path: string, query?: Record<string, string | number | boolean | undefined>): AsyncIterable<T> {
    let url = `${this.baseUrl}${path}`

    if (query) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) params.set(key, String(value))
      }
      const qs = params.toString()
      if (qs) url += `?${qs}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.headers(),
        'Accept': 'text/event-stream',
      },
    })

    if (!response.ok) {
      await this.handleErrorResponse(response)
    }

    if (!response.body) return

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') return
            if (data) {
              yield JSON.parse(data) as T
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private async fetchWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, init)

        // Don't retry client errors (4xx) except 429
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return response
        }

        // Retry on 429 and 5xx
        if (response.status === 429 || response.status >= 500) {
          if (attempt < retries) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
          return response
        }

        return response
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
    }

    throw lastError ?? new Error('Request failed')
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let body: ApiErrorBody | undefined

    try {
      body = await response.json() as ApiErrorBody
    } catch {
      // Response body wasn't JSON
    }

    throw new TheazoError({
      code: (body?.error?.code as TheazoErrorCode) ?? 'connection_error',
      message: body?.error?.message ?? `HTTP ${response.status}: ${response.statusText}`,
      status: response.status,
      details: body?.error?.details,
      requestId: body?.requestId ?? response.headers.get('x-request-id') ?? undefined,
    })
  }
}
