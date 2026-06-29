import { describe, it, expect, beforeEach } from 'vitest'
import { Agent } from '../src/agent.js'
import { createMockHttp, makeAgentData } from './helpers.js'

describe('Agent', () => {
  let http: ReturnType<typeof createMockHttp>
  let agent: Agent

  beforeEach(() => {
    http = createMockHttp()
    agent = new Agent(makeAgentData(), http)
  })

  describe('constructor', () => {
    it('sets all properties from data', () => {
      const data = makeAgentData({
        id: 'agt_custom',
        sessionId: 'ses_custom',
        userId: 'user_custom',
        status: 'running',
        provider: 'e2b',
        compute: 'node',
        model: 'gpt-4o',
        browser: true,
        region: 'eu-west-1',
      })
      const a = new Agent(data, http)

      expect(a.id).toBe('agt_custom')
      expect(a.sessionId).toBe('ses_custom')
      expect(a.userId).toBe('user_custom')
      expect(a.currentStatus).toBe('running')
      expect(a.provider).toBe('e2b')
      expect(a.compute).toBe('node')
      expect(a.model).toBe('gpt-4o')
      expect(a.browser).toBe(true)
      expect(a.region).toBe('eu-west-1')
    })
  })

  describe('run()', () => {
    it('calls POST /v1/agents/{id}/run with task', async () => {
      http.post.mockResolvedValueOnce({
        output: 'result',
        toolCalls: [{ tool: 'web_search', input: {}, output: 'found' }],
        cost: { amount: 10, currency: 'usd' },
        duration: '3s',
        durationMs: 3000,
      })

      const result = await agent.run('find competitor pricing')

      expect(http.post).toHaveBeenCalledWith('/v1/agents/agt_test123/run', {
        task: 'find competitor pricing',
      })
      expect(result.output).toBe('result')
      expect(result.toolCalls).toHaveLength(1)
    })

    it('defaults toolCalls to empty array when null', async () => {
      http.post.mockResolvedValueOnce({
        output: 'result',
        toolCalls: null,
        cost: { amount: 5, currency: 'usd' },
      })

      const result = await agent.run('simple task')
      expect(result.toolCalls).toEqual([])
    })

    it('passes maxCost option', async () => {
      http.post.mockResolvedValueOnce({ output: 'ok', toolCalls: [] })
      await agent.run('task', { maxCost: { amount: 100, currency: 'usd' } })

      expect(http.post).toHaveBeenCalledWith('/v1/agents/agt_test123/run', {
        task: 'task',
        maxCost: { amount: 100, currency: 'usd' },
      })
    })
  })

  describe('exec()', () => {
    it('calls POST /v1/agents/{id}/exec with language and code', async () => {
      http.post.mockResolvedValueOnce({ stdout: '42\n', stderr: '', exitCode: 0 })
      const result = await agent.exec('python', 'print(6 * 7)')

      expect(http.post).toHaveBeenCalledWith('/v1/agents/agt_test123/exec', {
        language: 'python',
        code: 'print(6 * 7)',
      })
      expect(result.stdout).toBe('42\n')
      expect(result.exitCode).toBe(0)
    })
  })

  describe('files namespace', () => {
    it('write sends string data with utf-8 encoding', async () => {
      http.post.mockResolvedValueOnce(undefined)
      await agent.files.write('/data/test.txt', 'hello world')

      expect(http.post).toHaveBeenCalledWith('/v1/agents/agt_test123/files', {
        path: '/data/test.txt',
        data: 'hello world',
        encoding: 'utf-8',
      })
    })

    it('write sends Buffer data with base64 encoding', async () => {
      http.post.mockResolvedValueOnce(undefined)
      const buf = Buffer.from('binary data')
      await agent.files.write('/data/file.bin', buf)

      expect(http.post).toHaveBeenCalledWith('/v1/agents/agt_test123/files', {
        path: '/data/file.bin',
        data: buf.toString('base64'),
        encoding: 'base64',
      })
    })

    it('read strips leading slash from path', async () => {
      http.get.mockResolvedValueOnce({ data: 'aGVsbG8=', encoding: 'base64' })
      const result = await agent.files.read('/data/test.txt')

      expect(http.get).toHaveBeenCalledWith('/v1/agents/agt_test123/files/data/test.txt')
      expect(result).toBeInstanceOf(Buffer)
    })

    it('read handles base64 encoding', async () => {
      http.get.mockResolvedValueOnce({
        data: Buffer.from('hello').toString('base64'),
        encoding: 'base64',
      })
      const result = await agent.files.read('test.txt')

      expect(result.toString()).toBe('hello')
    })

    it('read handles utf-8 encoding', async () => {
      http.get.mockResolvedValueOnce({ data: 'plain text', encoding: 'utf-8' })
      const result = await agent.files.read('test.txt')

      expect(result.toString()).toBe('plain text')
    })

    it('list calls GET /v1/agents/{id}/files with dir param', async () => {
      http.get.mockResolvedValueOnce([{ name: 'file1.txt', size: 100 }])
      await agent.files.list('/workspace')

      expect(http.get).toHaveBeenCalledWith('/v1/agents/agt_test123/files', {
        dir: '/workspace',
      })
    })

    it('list defaults dir to /data', async () => {
      http.get.mockResolvedValueOnce([])
      await agent.files.list()

      expect(http.get).toHaveBeenCalledWith('/v1/agents/agt_test123/files', {
        dir: '/data',
      })
    })
  })

  describe('ports namespace', () => {
    it('expose calls POST /v1/agents/{id}/ports', async () => {
      http.post.mockResolvedValueOnce({ url: 'https://agt-test123-8080.theazo.com' })
      const url = await agent.ports.expose(8080)

      expect(http.post).toHaveBeenCalledWith('/v1/agents/agt_test123/ports', { port: 8080 })
      expect(url).toBe('https://agt-test123-8080.theazo.com')
    })
  })

  describe('lifecycle methods', () => {
    it('status calls GET /v1/agents/{id}/status', async () => {
      http.get.mockResolvedValueOnce({ status: 'running', duration: '5m', cost: { amount: 20, currency: 'usd' } })
      const info = await agent.status()

      expect(http.get).toHaveBeenCalledWith('/v1/agents/agt_test123/status')
      expect(info.status).toBe('running')
    })

    it('pause calls POST /v1/agents/{id}/pause and returns snapshot', async () => {
      http.post.mockResolvedValueOnce({ id: 'snap_1', size: '256MB', provider: 'theazo' })
      const snap = await agent.pause()

      expect(http.post).toHaveBeenCalledWith('/v1/agents/agt_test123/pause')
      expect(snap.id).toBe('snap_1')
      expect(agent.currentStatus).toBe('paused')
    })

    it('resume calls POST /v1/agents/{id}/resume with opts', async () => {
      http.post.mockResolvedValueOnce(undefined)
      await agent.resume({ provider: 'e2b', region: 'eu-west-1' })

      expect(http.post).toHaveBeenCalledWith('/v1/agents/agt_test123/resume', {
        provider: 'e2b',
        region: 'eu-west-1',
      })
      expect(agent.currentStatus).toBe('running')
    })

    it('retry calls POST /v1/agents/{id}/retry', async () => {
      http.post.mockResolvedValueOnce(undefined)
      await agent.retry()

      expect(http.post).toHaveBeenCalledWith('/v1/agents/agt_test123/retry')
      expect(agent.currentStatus).toBe('running')
    })

    it('terminate calls POST /v1/agents/{id}/terminate', async () => {
      http.post.mockResolvedValueOnce(undefined)
      await agent.terminate()

      expect(http.post).toHaveBeenCalledWith('/v1/agents/agt_test123/terminate')
      expect(agent.currentStatus).toBe('completed')
    })
  })

  describe('long-running session methods', () => {
    it('send calls POST /v1/agents/{id}/send', async () => {
      http.post.mockResolvedValueOnce(undefined)
      await agent.send({ type: 'user_input', content: 'continue' })

      expect(http.post).toHaveBeenCalledWith('/v1/agents/agt_test123/send', {
        type: 'user_input',
        content: 'continue',
      })
    })

    it('progress calls GET /v1/agents/{id}/progress', async () => {
      http.get.mockResolvedValueOnce({ phase: 'research', checkpoints: 3, status: 'active' })
      const prog = await agent.progress()

      expect(http.get).toHaveBeenCalledWith('/v1/agents/agt_test123/progress')
      expect(prog.phase).toBe('research')
    })

    it('checkpoints unwraps { data: [...] }', async () => {
      http.get.mockResolvedValueOnce({ data: [{ id: 'ckpt_1' }] })
      const ckpts = await agent.checkpoints()

      expect(http.get).toHaveBeenCalledWith('/v1/agents/agt_test123/checkpoints')
      expect(ckpts).toEqual([{ id: 'ckpt_1' }])
    })

    it('checkpoint calls POST /v1/agents/{id}/checkpoints', async () => {
      http.post.mockResolvedValueOnce({ id: 'ckpt_2' })
      await agent.checkpoint({ phase: 'analysis', progress: 50 })

      expect(http.post).toHaveBeenCalledWith('/v1/agents/agt_test123/checkpoints', {
        phase: 'analysis',
        progress: 50,
      })
    })
  })
})
