import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('theazo-sandbox', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    // Set required env vars
    process.env.THEAZO_AGENT_ID = 'agt_test'
    process.env.THEAZO_SESSION_ID = 'ses_test'
    process.env.THEAZO_ENDPOINT = 'https://api.theazo.com'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    delete process.env.THEAZO_AGENT_ID
    delete process.env.THEAZO_SESSION_ID
    delete process.env.THEAZO_ENDPOINT
  })

  it('does not crash caller when env vars are missing', async () => {
    delete process.env.THEAZO_AGENT_ID

    // Catch the unhandled rejection from void post(...)
    // getConfig() throws inside an async function called with `void`,
    // resulting in an unhandled rejection — not a sync throw
    const rejections: Error[] = []
    const handler = (err: unknown) => { rejections.push(err as Error) }
    process.on('unhandledRejection', handler)

    const mod = await import('../src/index.js')

    // Caller should NOT crash — fire-and-forget behavior
    expect(() => mod.log.info('test')).not.toThrow()

    await new Promise(r => setTimeout(r, 50))
    process.off('unhandledRejection', handler)

    // The rejection happened but didn't crash
    expect(rejections).toHaveLength(1)
    expect(rejections[0].message).toContain('Missing Theazo sandbox env vars')

    // fetch was never called since getConfig() threw first
    expect(fetchMock).not.toHaveBeenCalled()
  })

  describe('log', () => {
    it('sends POST to /v1/sandbox/log with level and message', async () => {
      const { log } = await import('../src/index.js')
      log.info('Agent started processing')

      // Fire-and-forget — give the async post a tick to fire
      await new Promise(r => setTimeout(r, 10))

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.theazo.com/v1/sandbox/log',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.level).toBe('info')
      expect(body.message).toBe('Agent started processing')
      expect(body.agentId).toBe('agt_test')
      expect(body.sessionId).toBe('ses_test')
      expect(body.timestamp).toBeDefined()
    })

    it('supports all log levels', async () => {
      const { log } = await import('../src/index.js')

      log.debug('debug msg')
      log.info('info msg')
      log.warn('warn msg')
      log.error('error msg')

      await new Promise(r => setTimeout(r, 10))

      expect(fetchMock).toHaveBeenCalledTimes(4)
    })

    it('passes metadata', async () => {
      const { log } = await import('../src/index.js')
      log.info('step done', { step: 'research', tokens: 500 })

      await new Promise(r => setTimeout(r, 10))

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.metadata).toEqual({ step: 'research', tokens: 500 })
    })

    it('does not throw on fetch failure (fire-and-forget)', async () => {
      fetchMock.mockRejectedValue(new Error('network down'))
      const { log } = await import('../src/index.js')

      // Should not throw
      expect(() => log.error('something failed')).not.toThrow()
    })
  })

  describe('model.track', () => {
    it('sends POST to /v1/sandbox/model', async () => {
      const { model } = await import('../src/index.js')
      model.track({
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 200,
        cost: { amount: 5, currency: 'usd' },
      })

      await new Promise(r => setTimeout(r, 10))

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.model).toBe('claude-sonnet-4-20250514')
      expect(body.inputTokens).toBe(1000)
      expect(body.outputTokens).toBe(200)
      expect(body.cost).toEqual({ amount: 5, currency: 'usd' })
    })
  })

  describe('span', () => {
    it('wraps a function and reports timing', async () => {
      const { span } = await import('../src/index.js')
      const result = await span('research', async () => {
        return 'found 5 results'
      })

      expect(result).toBe('found 5 results')

      await new Promise(r => setTimeout(r, 10))

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.name).toBe('research')
      expect(body.status).toBe('completed')
      expect(body.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('reports failed spans and re-throws', async () => {
      const { span } = await import('../src/index.js')

      await expect(
        span('failing-task', async () => {
          throw new Error('boom')
        })
      ).rejects.toThrow('boom')

      await new Promise(r => setTimeout(r, 10))

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.status).toBe('failed')
      expect(body.error).toBe('boom')
    })
  })

  describe('progress', () => {
    it('sends POST to /v1/sandbox/progress', async () => {
      const { progress } = await import('../src/index.js')
      progress(50, 'Halfway done')

      await new Promise(r => setTimeout(r, 10))

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.percentage).toBe(50)
      expect(body.message).toBe('Halfway done')
    })
  })

  describe('complete', () => {
    it('sends POST to /v1/sandbox/complete', async () => {
      const { complete } = await import('../src/index.js')
      complete({ output: 'Report generated', artifacts: ['report.pdf'] })

      await new Promise(r => setTimeout(r, 10))

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.output).toBe('Report generated')
      expect(body.artifacts).toEqual(['report.pdf'])
    })

    it('defaults artifacts to empty array', async () => {
      const { complete } = await import('../src/index.js')
      complete({ output: 'Done' })

      await new Promise(r => setTimeout(r, 10))

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.artifacts).toEqual([])
    })
  })

  describe('default export', () => {
    it('exposes all functions on theazo object', async () => {
      const { theazo } = await import('../src/index.js')

      expect(theazo.log).toBeDefined()
      expect(theazo.model).toBeDefined()
      expect(theazo.span).toBeDefined()
      expect(theazo.progress).toBeDefined()
      expect(theazo.complete).toBeDefined()
    })
  })
})
