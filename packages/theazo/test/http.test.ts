import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HttpClient } from '../src/http.js'
import { TheazoError } from '../src/errors.js'

// ─── Helpers ──────────────────────────────────────────────────────

function mockFetch(response: Partial<Response> = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => '{}',
    json: async () => ({}),
    headers: new Headers(),
    body: null,
    ...response,
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: async () => JSON.stringify(data),
    json: async () => data,
    headers: new Headers({ 'x-request-id': 'req_test' }),
    body: null,
  }
}

function errorResponse(code: string, message: string, status: number) {
  return {
    ok: false,
    status,
    statusText: 'Error',
    text: async () => JSON.stringify({ error: { code, message } }),
    json: async () => ({ error: { code, message } }),
    headers: new Headers({ 'x-request-id': 'req_err' }),
    body: null,
  }
}

// ─── Tests ────────────────────────────────────────────────────────

describe('HttpClient', () => {
  let http: HttpClient

  beforeEach(() => {
    http = new HttpClient({ baseUrl: 'https://api.theazo.com', apiKey: 'th_test_key' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('headers', () => {
    it('sends Authorization, Content-Type, and SDK version', async () => {
      const fetchMock = mockFetch(jsonResponse({ ok: true }))
      await http.get('/v1/test')

      const [, init] = fetchMock.mock.calls[0]
      expect(init.headers).toMatchObject({
        'Authorization': 'Bearer th_test_key',
        'Content-Type': 'application/json',
        'X-SDK-Version': '0.1.0',
      })
    })
  })

  describe('URL construction', () => {
    it('builds full URL from base + path', async () => {
      const fetchMock = mockFetch(jsonResponse({}))
      await http.get('/v1/sessions')

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.theazo.com/v1/sessions')
    })

    it('strips trailing slash from baseUrl', async () => {
      const h = new HttpClient({ baseUrl: 'https://api.theazo.com/', apiKey: 'key' })
      const fetchMock = mockFetch(jsonResponse({}))
      await h.get('/v1/test')

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.theazo.com/v1/test')
    })

    it('appends query params', async () => {
      const fetchMock = mockFetch(jsonResponse({}))
      await http.get('/v1/sessions', { status: 'active', limit: 10 })

      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('status=active')
      expect(url).toContain('limit=10')
    })

    it('omits undefined query params', async () => {
      const fetchMock = mockFetch(jsonResponse({}))
      await http.get('/v1/sessions', { status: undefined, limit: 5 })

      const url = fetchMock.mock.calls[0][0] as string
      expect(url).not.toContain('status')
      expect(url).toContain('limit=5')
    })

    it('does not append query string when all params are undefined', async () => {
      const fetchMock = mockFetch(jsonResponse({}))
      await http.get('/v1/sessions', { status: undefined })

      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.theazo.com/v1/sessions')
    })
  })

  describe('HTTP methods', () => {
    it('GET sends method=GET with no body', async () => {
      const fetchMock = mockFetch(jsonResponse({}))
      await http.get('/v1/test')

      expect(fetchMock.mock.calls[0][1].method).toBe('GET')
      expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
    })

    it('POST sends method=POST with JSON body', async () => {
      const fetchMock = mockFetch(jsonResponse({}))
      await http.post('/v1/sessions', { userId: 'u1' })

      expect(fetchMock.mock.calls[0][1].method).toBe('POST')
      expect(fetchMock.mock.calls[0][1].body).toBe('{"userId":"u1"}')
    })

    it('PUT sends method=PUT', async () => {
      const fetchMock = mockFetch(jsonResponse({}))
      await http.put('/v1/guardrails', { blockPII: true })

      expect(fetchMock.mock.calls[0][1].method).toBe('PUT')
    })

    it('PATCH sends method=PATCH', async () => {
      const fetchMock = mockFetch(jsonResponse({}))
      await http.patch('/v1/sessions/ses_1/limits', { maxAgents: 5 })

      expect(fetchMock.mock.calls[0][1].method).toBe('PATCH')
    })

    it('DELETE sends method=DELETE', async () => {
      const fetchMock = mockFetch(jsonResponse({}))
      await http.delete('/v1/webhooks/wh_1')

      expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
    })
  })

  describe('response parsing', () => {
    it('returns parsed JSON', async () => {
      mockFetch(jsonResponse({ id: 'ses_1', status: 'active' }))
      const result = await http.get('/v1/sessions/ses_1')

      expect(result).toEqual({ id: 'ses_1', status: 'active' })
    })

    it('returns undefined for 204 No Content', async () => {
      mockFetch({ ok: true, status: 204, text: async () => '', headers: new Headers() })
      const result = await http.delete('/v1/webhooks/wh_1')

      expect(result).toBeUndefined()
    })

    it('handles empty response body', async () => {
      mockFetch({ ok: true, status: 200, text: async () => '', headers: new Headers() })
      const result = await http.post('/v1/test')

      expect(result).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('throws TheazoError with API error body', async () => {
      mockFetch(errorResponse('unauthorized', 'Invalid API key', 401))

      await expect(http.get('/v1/sessions')).rejects.toThrow(TheazoError)

      try {
        await http.get('/v1/sessions')
      } catch (err) {
        expect(err).toBeInstanceOf(TheazoError)
        const e = err as TheazoError
        expect(e.code).toBe('unauthorized')
        expect(e.message).toBe('Invalid API key')
        expect(e.status).toBe(401)
      }
    })

    it('handles non-JSON error response', async () => {
      // Use 422 (4xx, no retry) so the test doesn't trigger retry delays
      mockFetch({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => { throw new Error('not JSON') },
        headers: new Headers(),
      })

      await expect(http.get('/v1/test')).rejects.toThrow(TheazoError)

      try {
        await http.get('/v1/test')
      } catch (err) {
        const e = err as TheazoError
        expect(e.status).toBe(422)
        expect(e.code).toBe('connection_error')
      }
    })

    it('extracts requestId from response header', async () => {
      mockFetch({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: { code: 'provider_error', message: 'fail' } }),
        headers: new Headers({ 'x-request-id': 'req_xyz' }),
      })

      try {
        await http.get('/v1/test')
      } catch (err) {
        const e = err as TheazoError
        expect(e.requestId).toBe('req_xyz')
      }
    })

    it('throws TheazoError on network failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')))

      // fetchWithRetry retries network errors (1s + 2s delays), so allow enough time
      try {
        await http.get('/v1/test')
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(TheazoError)
        const e = err as TheazoError
        expect(e.code).toBe('connection_error')
        expect(e.message).toContain('Network down')
      }
    }, 15000)
  })

  describe('retry logic', () => {
    it('retries on 429', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(errorResponse('rate_limited', 'Slow down', 429))
        .mockResolvedValueOnce(jsonResponse({ ok: true }))
      vi.stubGlobal('fetch', fetchMock)

      // Use a shorter timeout to speed up test — but retry has built-in delay
      // We just verify it retries by checking call count
      const result = await http.get('/v1/test')
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ ok: true })
    }, 15000)

    it('retries on 500', async () => {
      let callCount = 0
      const fetchMock = vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          return errorResponse('provider_error', 'Server error', 500)
        }
        return jsonResponse({ recovered: true })
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await http.get('/v1/test')
      expect(callCount).toBe(2)
      expect(result).toEqual({ recovered: true })
    }, 15000)

    it('does NOT retry on 400', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(errorResponse('invalid_request', 'Bad input', 400))
      vi.stubGlobal('fetch', fetchMock)

      await expect(http.get('/v1/test')).rejects.toThrow(TheazoError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('does NOT retry on 401', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(errorResponse('unauthorized', 'Bad key', 401))
      vi.stubGlobal('fetch', fetchMock)

      await expect(http.get('/v1/test')).rejects.toThrow(TheazoError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('does NOT retry on 404', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(errorResponse('not_found', 'Not found', 404))
      vi.stubGlobal('fetch', fetchMock)

      await expect(http.get('/v1/test')).rejects.toThrow(TheazoError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('retries on network error', async () => {
      const fetchMock = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce(jsonResponse({ ok: true }))
      vi.stubGlobal('fetch', fetchMock)

      const result = await http.get('/v1/test')
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ ok: true })
    }, 15000)

    it('gives up after max retries', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValue(errorResponse('provider_error', 'Server error', 500))
      vi.stubGlobal('fetch', fetchMock)

      await expect(http.get('/v1/test')).rejects.toThrow(TheazoError)
      // 1 initial + 2 retries = 3 total
      expect(fetchMock).toHaveBeenCalledTimes(3)
    }, 30000)
  })

  describe('SSE streaming', () => {
    function createSSEStream(lines: string[]) {
      const text = lines.join('\n') + '\n'
      const encoder = new TextEncoder()
      const chunks = [encoder.encode(text)]
      let index = 0

      return {
        getReader: () => ({
          read: async () => {
            if (index < chunks.length) {
              return { done: false, value: chunks[index++] }
            }
            return { done: true, value: undefined }
          },
          releaseLock: () => {},
        }),
      }
    }

    it('yields parsed SSE data events', async () => {
      const body = createSSEStream([
        'data: {"type":"text","text":"hello"}',
        'data: {"type":"text","text":" world"}',
        'data: [DONE]',
      ])

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        body,
      }))

      const events: unknown[] = []
      for await (const event of http.stream('/v1/test/stream')) {
        events.push(event)
      }

      expect(events).toEqual([
        { type: 'text', text: 'hello' },
        { type: 'text', text: ' world' },
      ])
    })

    it('stops on [DONE] sentinel', async () => {
      const body = createSSEStream([
        'data: {"type":"text","text":"a"}',
        'data: [DONE]',
        'data: {"type":"text","text":"should not appear"}',
      ])

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true, status: 200, headers: new Headers(), body,
      }))

      const events: unknown[] = []
      for await (const event of http.stream('/v1/test/stream')) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
    })

    it('handles event: prefix lines', async () => {
      const body = createSSEStream([
        'event: message',
        'data: {"type":"text","text":"hi"}',
        'data: [DONE]',
      ])

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true, status: 200, headers: new Headers(), body,
      }))

      const events: unknown[] = []
      for await (const event of http.stream('/v1/test/stream')) {
        events.push(event)
      }

      expect(events).toEqual([{ type: 'text', text: 'hi' }])
    })

    it('returns empty for null body', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true, status: 200, headers: new Headers(), body: null,
      }))

      const events: unknown[] = []
      for await (const event of http.stream('/v1/test/stream')) {
        events.push(event)
      }

      expect(events).toHaveLength(0)
    })

    it('throws TheazoError on stream error response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { code: 'unauthorized', message: 'Bad key' } }),
        headers: new Headers(),
      }))

      const iter = http.stream('/v1/test/stream')
      await expect(async () => {
        for await (const _ of iter) { /* consume */ }
      }).rejects.toThrow(TheazoError)
    })

    it('sends Accept: text/event-stream header for streams', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true, status: 200, headers: new Headers(), body: null,
      })
      vi.stubGlobal('fetch', fetchMock)

      for await (const _ of http.stream('/v1/test/stream')) { /* consume */ }

      expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
        'Accept': 'text/event-stream',
      })
    })
  })
})
