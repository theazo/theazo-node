import { describe, it, expect, beforeEach } from 'vitest'
import { Session } from '../src/session.js'
import { createMockHttp, makeSessionData, makeAgentData } from './helpers.js'

describe('Session', () => {
  let http: ReturnType<typeof createMockHttp>
  let session: Session

  beforeEach(() => {
    http = createMockHttp()
    session = new Session(makeSessionData(), http)
  })

  describe('constructor', () => {
    it('sets all properties from data', () => {
      const data = makeSessionData({
        id: 'ses_custom',
        userId: 'user_custom',
        status: 'paused',
        metadata: { tier: 'pro' },
        createdAt: '2026-06-01T00:00:00Z',
        pausedAt: '2026-06-01T01:00:00Z',
        terminatedAt: null,
      })
      const s = new Session(data, http)

      expect(s.id).toBe('ses_custom')
      expect(s.userId).toBe('user_custom')
      expect(s.status).toBe('paused')
      expect(s.metadata).toEqual({ tier: 'pro' })
      expect(s.createdAt).toBe('2026-06-01T00:00:00Z')
      expect(s.pausedAt).toBe('2026-06-01T01:00:00Z')
      expect(s.terminatedAt).toBeNull()
    })
  })

  describe('run()', () => {
    it('calls POST /v1/sessions/{id}/run with agent and task', async () => {
      http.post.mockResolvedValueOnce({ output: 'done', cost: { amount: 5, currency: 'usd' } })
      await session.run('researcher', 'analyze pricing')

      expect(http.post).toHaveBeenCalledWith('/v1/sessions/ses_test123/run', {
        agent: 'researcher',
        task: 'analyze pricing',
      })
    })

    it('passes additional opts', async () => {
      http.post.mockResolvedValueOnce({ output: 'done' })
      await session.run('researcher', 'task', { browser: true })

      expect(http.post).toHaveBeenCalledWith('/v1/sessions/ses_test123/run', {
        agent: 'researcher',
        task: 'task',
        browser: true,
      })
    })
  })

  describe('agents namespace', () => {
    it('create calls POST /v1/sessions/{id}/agents', async () => {
      http.post.mockResolvedValueOnce(makeAgentData())
      const agent = await session.agents.create({ compute: 'python' })

      expect(http.post).toHaveBeenCalledWith('/v1/sessions/ses_test123/agents', { compute: 'python' })
      expect(agent.id).toBe('agt_test123')
    })

    it('list calls GET /v1/sessions/{id}/agents with filters', async () => {
      http.get.mockResolvedValueOnce({ data: [makeAgentData()] })
      const agents = await session.agents.list({ status: 'running' })

      expect(http.get).toHaveBeenCalledWith('/v1/sessions/ses_test123/agents', expect.objectContaining({
        status: 'running',
      }))
      expect(agents).toHaveLength(1)
    })

    it('list handles array response', async () => {
      http.get.mockResolvedValueOnce([makeAgentData()])
      const agents = await session.agents.list()

      expect(agents).toHaveLength(1)
    })
  })

  describe('fleets namespace', () => {
    it('dispatch calls POST /v1/sessions/{id}/fleets', async () => {
      http.post.mockResolvedValueOnce({ id: 'flt_1', status: 'dispatching', totalItems: 5 })
      const fleet = await session.fleets.dispatch({
        agent: 'researcher',
        inputs: [{ company: 'Stripe' }, { company: 'Vercel' }],
        concurrency: 3,
      })

      expect(http.post).toHaveBeenCalledWith('/v1/sessions/ses_test123/fleets', {
        agent: 'researcher',
        inputs: [{ company: 'Stripe' }, { company: 'Vercel' }],
        concurrency: 3,
      })
      expect(fleet.id).toBe('flt_1')
      expect(fleet.totalItems).toBe(5)
      expect(fleet.currentStatus).toBe('dispatching')
    })
  })

  describe('teams namespace', () => {
    it('create calls POST /v1/sessions/{id}/teams', async () => {
      http.post.mockResolvedValueOnce({
        id: 'team_1',
        name: 'research-team',
        agents: [],
        coordination: 'sequential',
      })
      const team = await session.teams.create({
        name: 'research-team',
        agents: [{ role: 'researcher', agent: 'researcher', instructions: 'Research' }],
        coordination: 'sequential',
      })

      expect(http.post).toHaveBeenCalledWith('/v1/sessions/ses_test123/teams', expect.objectContaining({
        name: 'research-team',
      }))
      expect(team.id).toBe('team_1')
    })
  })

  describe('knowledge namespace', () => {
    it('upload calls POST /v1/knowledge/upload with userId and base64 files', async () => {
      http.post.mockResolvedValueOnce(undefined)
      await session.knowledge.upload({
        files: [{ filename: 'doc.txt', content: Buffer.from('hello') }],
        collection: 'docs',
      })

      expect(http.post).toHaveBeenCalledWith('/v1/knowledge/upload', {
        userId: 'user_test',
        collection: 'docs',
        files: [{
          filename: 'doc.txt',
          data: Buffer.from('hello').toString('base64'),
          mimeType: undefined,
        }],
      })
    })

    it('query calls POST /v1/knowledge/query with userId', async () => {
      http.post.mockResolvedValueOnce({ data: [{ content: 'result', score: 0.9 }] })
      const results = await session.knowledge.query('what is pricing?', {
        collection: 'docs',
        topK: 5,
      })

      expect(http.post).toHaveBeenCalledWith('/v1/knowledge/query', {
        userId: 'user_test',
        query: 'what is pricing?',
        collection: 'docs',
        topK: 5,
      })
      expect(results).toEqual([{ content: 'result', score: 0.9 }])
    })

    it('stats passes userId as query param', async () => {
      http.get.mockResolvedValueOnce({ collections: 2, totalChunks: 100 })
      await session.knowledge.stats()

      expect(http.get).toHaveBeenCalledWith('/v1/knowledge/stats', { userId: 'user_test' })
    })

    it('deleteCollection encodes name and userId in URL', async () => {
      http.delete.mockResolvedValueOnce(undefined)
      await session.knowledge.deleteCollection('my docs')

      expect(http.delete).toHaveBeenCalledWith(
        '/v1/knowledge/collections/my%20docs?userId=user_test'
      )
    })
  })

  describe('tasks namespace', () => {
    it('submit calls POST /v1/sessions/{id}/tasks', async () => {
      http.post.mockResolvedValueOnce({ taskId: 'task_1', status: 'queued' })
      await session.tasks.submit({ agent: 'worker', input: { url: 'https://example.com' } })

      expect(http.post).toHaveBeenCalledWith('/v1/sessions/ses_test123/tasks', {
        agent: 'worker',
        input: { url: 'https://example.com' },
      })
    })

    it('wait calls GET /v1/sessions/{id}/tasks/{taskId}/wait', async () => {
      http.get.mockResolvedValueOnce({ taskId: 'task_1', status: 'completed' })
      await session.tasks.wait('task_1', { timeout: '30s' })

      expect(http.get).toHaveBeenCalledWith('/v1/sessions/ses_test123/tasks/task_1/wait', {
        timeout: '30s',
      })
    })

    it('cancel calls POST /v1/sessions/{id}/tasks/{taskId}/cancel', async () => {
      http.post.mockResolvedValueOnce(undefined)
      await session.tasks.cancel('task_1')

      expect(http.post).toHaveBeenCalledWith('/v1/sessions/ses_test123/tasks/task_1/cancel')
    })
  })

  describe('secrets namespace', () => {
    it('set calls POST /v1/sessions/{id}/secrets', async () => {
      http.post.mockResolvedValueOnce(undefined)
      await session.secrets.set({ API_KEY: 'sk_123', DB_URL: 'postgres://...' })

      expect(http.post).toHaveBeenCalledWith('/v1/sessions/ses_test123/secrets', {
        API_KEY: 'sk_123',
        DB_URL: 'postgres://...',
      })
    })

    it('delete encodes secret name', async () => {
      http.delete.mockResolvedValueOnce(undefined)
      await session.secrets.delete('MY KEY')

      expect(http.delete).toHaveBeenCalledWith('/v1/sessions/ses_test123/secrets/MY%20KEY')
    })
  })

  describe('chat namespace', () => {
    it('create calls POST /v1/sessions/{id}/chat', async () => {
      http.post.mockResolvedValueOnce({ id: 'conv_1' })
      await session.chat.create({ agent: 'assistant', title: 'Test' })

      expect(http.post).toHaveBeenCalledWith('/v1/sessions/ses_test123/chat', {
        agent: 'assistant',
        title: 'Test',
      })
    })

    it('create sends empty object when no opts', async () => {
      http.post.mockResolvedValueOnce({ id: 'conv_1' })
      await session.chat.create()

      expect(http.post).toHaveBeenCalledWith('/v1/sessions/ses_test123/chat', {})
    })

    it('send calls POST /v1/chat/{conversationId}/messages', async () => {
      http.post.mockResolvedValueOnce({ id: 'msg_1', role: 'assistant', content: 'Hello!' })
      await session.chat.send('conv_1', { content: 'Hi there' })

      expect(http.post).toHaveBeenCalledWith('/v1/chat/conv_1/messages', { content: 'Hi there' })
    })

    it('get calls GET /v1/chat/{conversationId}', async () => {
      http.get.mockResolvedValueOnce({ id: 'conv_1' })
      await session.chat.get('conv_1')

      expect(http.get).toHaveBeenCalledWith('/v1/chat/conv_1')
    })

    it('archive calls POST /v1/chat/{id}/archive', async () => {
      http.post.mockResolvedValueOnce(undefined)
      await session.chat.archive('conv_1')

      expect(http.post).toHaveBeenCalledWith('/v1/chat/conv_1/archive')
    })

    it('handoff calls POST /v1/chat/{id}/handoff', async () => {
      http.post.mockResolvedValueOnce({ id: 'ho_1' })
      await session.chat.handoff('conv_1', { reason: 'needs human', to: 'human' })

      expect(http.post).toHaveBeenCalledWith('/v1/chat/conv_1/handoff', {
        reason: 'needs human',
        to: 'human',
      })
    })

    it('search calls POST /v1/chat/search', async () => {
      http.post.mockResolvedValueOnce({ data: [{ messageId: 'msg_1', score: 0.95 }] })
      const results = await session.chat.search({ query: 'pricing', limit: 10 })

      expect(http.post).toHaveBeenCalledWith('/v1/chat/search', { query: 'pricing', limit: 10 })
      expect(results).toEqual([{ messageId: 'msg_1', score: 0.95 }])
    })

    it('messages passes pagination opts', async () => {
      http.get.mockResolvedValueOnce({ data: [], hasMore: false })
      await session.chat.messages('conv_1', { limit: 20, order: 'desc' })

      expect(http.get).toHaveBeenCalledWith('/v1/chat/conv_1/messages', {
        limit: 20,
        cursor: undefined,
        order: 'desc',
      })
    })
  })

  describe('lifecycle methods', () => {
    it('pause calls POST /v1/sessions/{id}/pause', async () => {
      http.post.mockResolvedValueOnce(undefined)
      await session.pause()

      expect(http.post).toHaveBeenCalledWith('/v1/sessions/ses_test123/pause')
      expect(session.status).toBe('paused')
    })

    it('resume calls POST /v1/sessions/{id}/resume', async () => {
      http.post.mockResolvedValueOnce(undefined)
      await session.resume()

      expect(http.post).toHaveBeenCalledWith('/v1/sessions/ses_test123/resume')
      expect(session.status).toBe('active')
    })

    it('terminate calls POST /v1/sessions/{id}/terminate', async () => {
      http.post.mockResolvedValueOnce(undefined)
      await session.terminate()

      expect(http.post).toHaveBeenCalledWith('/v1/sessions/ses_test123/terminate')
      expect(session.status).toBe('terminated')
    })
  })

  describe('usage and limits', () => {
    it('usage calls GET /v1/sessions/{id}/usage', async () => {
      http.get.mockResolvedValueOnce({ cost: { amount: 50, currency: 'usd' } })
      const usage = await session.usage()

      expect(http.get).toHaveBeenCalledWith('/v1/sessions/ses_test123/usage')
      expect(usage.cost.amount).toBe(50)
    })

    it('updateLimits calls PATCH /v1/sessions/{id}/limits', async () => {
      http.patch.mockResolvedValueOnce(undefined)
      await session.updateLimits({ maxAgents: 10 })

      expect(http.patch).toHaveBeenCalledWith('/v1/sessions/ses_test123/limits', { maxAgents: 10 })
    })
  })
})
