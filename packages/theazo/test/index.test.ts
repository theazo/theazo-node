import { describe, it, expect, vi } from 'vitest'
import { createMockHttp, makeSessionData, makeAgentData } from './helpers.js'

// We can't easily construct namespace classes directly since they're not exported.
// Instead we test through the Theazo class by mocking HttpClient at the module level.

vi.mock('../src/http.js', () => {
  const mockHttp = {
    get: vi.fn().mockResolvedValue(undefined),
    post: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    patch: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    stream: vi.fn(),
    streamPost: vi.fn(),
  }
  return {
    HttpClient: vi.fn(() => mockHttp),
    _mockHttp: mockHttp,
  }
})

import { Theazo } from '../src/index.js'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { _mockHttp: mockHttp } = await import('../src/http.js') as any

describe('Theazo constructor', () => {
  it('throws if apiKey is missing', () => {
    // @ts-expect-error testing invalid input
    expect(() => new Theazo({})).toThrow('apiKey is required')
  })

  it('creates all namespaces', () => {
    const t = new Theazo({ apiKey: 'th_test' })
    expect(t.sessions).toBeDefined()
    expect(t.agents).toBeDefined()
    expect(t.workflows).toBeDefined()
    expect(t.approvals).toBeDefined()
    expect(t.schedules).toBeDefined()
    expect(t.triggers).toBeDefined()
    expect(t.tools).toBeDefined()
    expect(t.logs).toBeDefined()
    expect(t.metrics).toBeDefined()
    expect(t.traces).toBeDefined()
    expect(t.usage).toBeDefined()
    expect(t.billing).toBeDefined()
    expect(t.guardrails).toBeDefined()
    expect(t.webhooks).toBeDefined()
    expect(t.mcp).toBeDefined()
    expect(t.channels).toBeDefined()
    expect(t.files).toBeDefined()
  })
})

describe('SessionsNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('create calls POST /v1/sessions', async () => {
    mockHttp.post.mockResolvedValueOnce(makeSessionData())
    await t.sessions.create({ userId: 'u1' })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/sessions', { userId: 'u1' })
  })

  it('get calls GET /v1/sessions/{id}', async () => {
    mockHttp.get.mockResolvedValueOnce(makeSessionData({ id: 'ses_abc' }))
    const session = await t.sessions.get('ses_abc')

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/sessions/ses_abc')
    expect(session.id).toBe('ses_abc')
  })

  it('forUser calls POST /v1/sessions/by-user/{userId}', async () => {
    mockHttp.post.mockResolvedValueOnce(makeSessionData({ userId: 'user@test.com' }))
    await t.sessions.forUser('user@test.com')

    expect(mockHttp.post).toHaveBeenCalledWith(
      '/v1/sessions/by-user/user%40test.com',
      undefined
    )
  })

  it('forUser encodes special characters in userId', async () => {
    mockHttp.post.mockResolvedValueOnce(makeSessionData())
    await t.sessions.forUser('user with spaces')

    expect(mockHttp.post).toHaveBeenCalledWith(
      '/v1/sessions/by-user/user%20with%20spaces',
      undefined
    )
  })

  it('forUser passes limits and metadata', async () => {
    mockHttp.post.mockResolvedValueOnce(makeSessionData())
    await t.sessions.forUser('u1', {
      limits: { maxCost: { amount: 500, currency: 'usd', period: 'day' } },
      metadata: { tier: 'pro' },
    })

    expect(mockHttp.post).toHaveBeenCalledWith(
      '/v1/sessions/by-user/u1',
      {
        limits: { maxCost: { amount: 500, currency: 'usd', period: 'day' } },
        metadata: { tier: 'pro' },
      }
    )
  })

  it('list calls GET /v1/sessions with filters as query params', async () => {
    mockHttp.get.mockResolvedValueOnce({ data: [], hasMore: false, cursor: '' })
    await t.sessions.list({ status: 'active', limit: 10 })

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/sessions', {
      status: 'active',
      createdAfter: undefined,
      limit: 10,
      cursor: undefined,
    })
  })

  it('list wraps results as Session instances', async () => {
    mockHttp.get.mockResolvedValueOnce({
      data: [makeSessionData({ id: 'ses_1' }), makeSessionData({ id: 'ses_2' })],
      hasMore: true,
      cursor: 'next',
    })

    const result = await t.sessions.list()
    expect(result.data).toHaveLength(2)
    expect(result.data[0].id).toBe('ses_1')
    expect(result.hasMore).toBe(true)
    expect(result.cursor).toBe('next')
  })
})

describe('AgentsNamespace (platform-scoped)', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('define calls POST /v1/agent-definitions', async () => {
    mockHttp.post.mockResolvedValueOnce({ id: 'adef_1', name: 'researcher' })
    await t.agents.define({
      name: 'researcher',
      description: 'Research agent',
      compute: 'python',
      model: 'claude-sonnet-4-20250514',
      instructions: 'Research topics',
    })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/agent-definitions', expect.objectContaining({
      name: 'researcher',
    }))
  })

  it('definitions calls GET /v1/agent-definitions', async () => {
    mockHttp.get.mockResolvedValueOnce([])
    await t.agents.definitions()

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/agent-definitions')
  })

  it('updateDefinition calls PUT /v1/agent-definitions/{id}', async () => {
    mockHttp.put.mockResolvedValueOnce({ id: 'adef_1' })
    await t.agents.updateDefinition('adef_1', { instructions: 'new instructions' })

    expect(mockHttp.put).toHaveBeenCalledWith('/v1/agent-definitions/adef_1', {
      instructions: 'new instructions',
    })
  })

  it('rollback calls POST /v1/agent-definitions/{id}/rollback', async () => {
    mockHttp.post.mockResolvedValueOnce(undefined)
    await t.agents.rollback('adef_1', { version: 2 })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/agent-definitions/adef_1/rollback', { version: 2 })
  })

  it('versions calls GET /v1/agent-definitions/{id}/versions', async () => {
    mockHttp.get.mockResolvedValueOnce([])
    await t.agents.versions('adef_1')

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/agent-definitions/adef_1/versions')
  })

  it('get calls GET /v1/agents/{id} and returns Agent', async () => {
    mockHttp.get.mockResolvedValueOnce(makeAgentData({ id: 'agt_abc' }))
    const agent = await t.agents.get('agt_abc')

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/agents/agt_abc')
    expect(agent.id).toBe('agt_abc')
  })

  it('list calls GET /v1/agents with filters', async () => {
    mockHttp.get.mockResolvedValueOnce({ data: [], hasMore: false, cursor: '' })
    await t.agents.list({ status: 'running', compute: 'python', limit: 5 })

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/agents', {
      status: 'running',
      provider: undefined,
      compute: 'python',
      limit: 5,
      cursor: undefined,
    })
  })
})

describe('WorkflowsNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('create calls POST /v1/workflows', async () => {
    mockHttp.post.mockResolvedValueOnce({ id: 'wf_1' })
    await t.workflows.create({ name: 'test', steps: [] })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/workflows', { name: 'test', steps: [] })
  })

  it('list handles array response', async () => {
    mockHttp.get.mockResolvedValueOnce([{ id: 'wf_1' }])
    const result = await t.workflows.list()

    expect(result).toEqual([{ id: 'wf_1' }])
  })

  it('list handles { data: [...] } response', async () => {
    mockHttp.get.mockResolvedValueOnce({ data: [{ id: 'wf_1' }] })
    const result = await t.workflows.list()

    expect(result).toEqual([{ id: 'wf_1' }])
  })

  it('get calls GET /v1/workflows/{id}', async () => {
    mockHttp.get.mockResolvedValueOnce({ id: 'wf_1' })
    await t.workflows.get('wf_1')

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/workflows/wf_1')
  })

  it('update calls PATCH /v1/workflows/{id}', async () => {
    mockHttp.patch.mockResolvedValueOnce({ id: 'wf_1' })
    await t.workflows.update('wf_1', { name: 'updated' })

    expect(mockHttp.patch).toHaveBeenCalledWith('/v1/workflows/wf_1', { name: 'updated' })
  })

  it('delete calls DELETE /v1/workflows/{id}', async () => {
    mockHttp.delete.mockResolvedValueOnce(undefined)
    await t.workflows.delete('wf_1')

    expect(mockHttp.delete).toHaveBeenCalledWith('/v1/workflows/wf_1')
  })

  it('run calls POST /v1/workflows/{id}/runs', async () => {
    mockHttp.post.mockResolvedValueOnce({ id: 'run_1' })
    await t.workflows.run('wf_1', { userId: 'u1', sessionId: 'ses_1' })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/workflows/wf_1/runs', {
      userId: 'u1',
      sessionId: 'ses_1',
    })
  })

  it('getRun calls GET /v1/workflow-runs/{runId}', async () => {
    mockHttp.get.mockResolvedValueOnce({ id: 'run_1' })
    await t.workflows.getRun('run_1')

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/workflow-runs/run_1')
  })

  it('cancelRun calls POST /v1/workflow-runs/{id}/cancel', async () => {
    mockHttp.post.mockResolvedValueOnce(undefined)
    await t.workflows.cancelRun('run_1')

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/workflow-runs/run_1/cancel')
  })

  it('estimate calls POST /v1/workflows/{id}/estimate', async () => {
    mockHttp.post.mockResolvedValueOnce({ estimated: { min: 10, max: 50, currency: 'usd' } })
    await t.workflows.estimate('wf_1', { input: { topic: 'AI' } })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/workflows/wf_1/estimate', {
      input: { topic: 'AI' },
    })
  })
})

describe('ApprovalsNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('list calls GET /v1/approvals with filters', async () => {
    mockHttp.get.mockResolvedValueOnce([])
    await t.approvals.list({ status: 'pending', sessionId: 'ses_1' })

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/approvals', {
      sessionId: 'ses_1',
      status: 'pending',
    })
  })

  it('approve calls POST /v1/approvals/{id}/approve', async () => {
    mockHttp.post.mockResolvedValueOnce(undefined)
    await t.approvals.approve('apr_1', { modifications: { amount: 100 } })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/approvals/apr_1/approve', {
      modifications: { amount: 100 },
    })
  })

  it('deny calls POST /v1/approvals/{id}/deny', async () => {
    mockHttp.post.mockResolvedValueOnce(undefined)
    await t.approvals.deny('apr_1', { reason: 'Too expensive' })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/approvals/apr_1/deny', {
      reason: 'Too expensive',
    })
  })

  it('bulkApprove calls POST /v1/approvals/bulk-approve', async () => {
    mockHttp.post.mockResolvedValueOnce(undefined)
    await t.approvals.bulkApprove(['apr_1', 'apr_2'])

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/approvals/bulk-approve', {
      ids: ['apr_1', 'apr_2'],
    })
  })

  it('get calls GET /v1/approvals/{id}', async () => {
    mockHttp.get.mockResolvedValueOnce({ id: 'apr_1', status: 'pending' })
    const result = await t.approvals.get('apr_1')

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/approvals/apr_1')
    expect(result.status).toBe('pending')
  })

  it('bulkDeny calls POST /v1/approvals/bulk-deny', async () => {
    mockHttp.post.mockResolvedValueOnce(undefined)
    await t.approvals.bulkDeny(['apr_1', 'apr_2'])

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/approvals/bulk-deny', {
      ids: ['apr_1', 'apr_2'],
    })
  })
})

describe('SchedulesNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('create calls POST /v1/schedules', async () => {
    mockHttp.post.mockResolvedValueOnce({ id: 'sch_1' })
    await t.schedules.create({ name: 'daily', agent: 'reporter', userId: 'u1', cron: '0 9 * * *' })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/schedules', expect.objectContaining({
      name: 'daily',
      cron: '0 9 * * *',
    }))
  })

  it('pause calls POST /v1/schedules/{id}/pause', async () => {
    mockHttp.post.mockResolvedValueOnce(undefined)
    await t.schedules.pause('sch_1')

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/schedules/sch_1/pause')
  })

  it('history calls GET /v1/schedules/{id}/history', async () => {
    mockHttp.get.mockResolvedValueOnce([])
    await t.schedules.history('sch_1')

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/schedules/sch_1/history')
  })

  it('list calls GET /v1/schedules', async () => {
    mockHttp.get.mockResolvedValueOnce([{ id: 'sch_1' }])
    const result = await t.schedules.list()

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/schedules')
    expect(result).toEqual([{ id: 'sch_1' }])
  })

  it('resume calls POST /v1/schedules/{id}/resume', async () => {
    mockHttp.post.mockResolvedValueOnce(undefined)
    await t.schedules.resume('sch_1')

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/schedules/sch_1/resume')
  })

  it('delete calls DELETE /v1/schedules/{id}', async () => {
    mockHttp.delete.mockResolvedValueOnce(undefined)
    await t.schedules.delete('sch_1')

    expect(mockHttp.delete).toHaveBeenCalledWith('/v1/schedules/sch_1')
  })
})

describe('ToolsNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('register calls POST /v1/tools', async () => {
    mockHttp.post.mockResolvedValueOnce({ name: 'web_search' })
    await t.tools.register({
      name: 'web_search',
      description: 'Search the web',
      parameters: {},
      handler: { type: 'webhook', url: 'https://example.com/search' },
    })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/tools', expect.objectContaining({
      name: 'web_search',
    }))
  })

  it('test encodes tool name in URL', async () => {
    mockHttp.post.mockResolvedValueOnce({ output: 'ok', success: true })
    await t.tools.test('web search', { query: 'test' })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/tools/web%20search/test', { query: 'test' })
  })

  it('delete encodes tool name in URL', async () => {
    mockHttp.delete.mockResolvedValueOnce(undefined)
    await t.tools.delete('my tool')

    expect(mockHttp.delete).toHaveBeenCalledWith('/v1/tools/my%20tool')
  })

  it('list calls GET /v1/tools', async () => {
    mockHttp.get.mockResolvedValueOnce([{ name: 'web_search' }])
    const result = await t.tools.list()

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/tools')
    expect(result).toEqual([{ name: 'web_search' }])
  })
})

describe('UsageNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('summary passes period as query param', async () => {
    mockHttp.get.mockResolvedValueOnce({})
    await t.usage.summary({ period: 'month' })

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/usage/summary', { period: 'month' })
  })

  it('forUser encodes userId in URL', async () => {
    mockHttp.get.mockResolvedValueOnce({})
    await t.usage.forUser('user@co.com', { period: 'week' })

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/usage/users/user%40co.com', { period: 'week' })
  })

  it('daily calls GET /v1/usage/daily', async () => {
    mockHttp.get.mockResolvedValueOnce([{ date: '2026-01-01' }])
    await t.usage.daily({ period: 'last_7_days' })

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/usage/daily', { period: 'last_7_days' })
  })

  it('byProvider calls GET /v1/usage/by-provider', async () => {
    mockHttp.get.mockResolvedValueOnce({ e2b: { amount: 50, currency: 'usd' } })
    await t.usage.byProvider({ period: 'month' })

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/usage/by-provider', { period: 'month' })
  })

  it('export calls GET /v1/usage/export', async () => {
    mockHttp.get.mockResolvedValueOnce({})
    await t.usage.export({ period: 'month', format: 'csv' })

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/usage/export', { period: 'month', format: 'csv' })
  })
})

describe('LogsNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('query handles array response', async () => {
    mockHttp.get.mockResolvedValueOnce([{ id: 'log_1' }])
    const result = await t.logs.query()

    expect(result).toEqual([{ id: 'log_1' }])
  })

  it('query handles { data: [...] } response', async () => {
    mockHttp.get.mockResolvedValueOnce({ data: [{ id: 'log_1' }] })
    const result = await t.logs.query()

    expect(result).toEqual([{ id: 'log_1' }])
  })

  it('query passes all filters', async () => {
    mockHttp.get.mockResolvedValueOnce([])
    await t.logs.query({
      sessionId: 'ses_1',
      agentId: 'agt_1',
      level: 'error',
      search: 'timeout',
      limit: 50,
    })

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/logs', {
      sessionId: 'ses_1',
      agentId: 'agt_1',
      level: 'error',
      search: 'timeout',
      since: undefined,
      until: undefined,
      limit: 50,
    })
  })
})

describe('GuardrailsNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('configure calls PUT /v1/guardrails', async () => {
    mockHttp.put.mockResolvedValueOnce(undefined)
    await t.guardrails.configure({ blockPII: true, contentFilter: 'strict' })

    expect(mockHttp.put).toHaveBeenCalledWith('/v1/guardrails', {
      blockPII: true,
      contentFilter: 'strict',
    })
  })

  it('violations handles both response shapes', async () => {
    mockHttp.get.mockResolvedValueOnce({ data: [{ id: 'v1' }] })
    const result = await t.guardrails.violations()

    expect(result).toEqual([{ id: 'v1' }])
  })

  it('get calls GET /v1/guardrails', async () => {
    mockHttp.get.mockResolvedValueOnce({ contentFilter: 'moderate', blockPII: true })
    const result = await t.guardrails.get()

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/guardrails')
    expect(result.blockPII).toBe(true)
  })
})

describe('WebhooksNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('create calls POST /v1/webhooks', async () => {
    mockHttp.post.mockResolvedValueOnce({ id: 'wh_1' })
    await t.webhooks.create({ url: 'https://example.com/hook', events: ['agent.completed'] })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/webhooks', {
      url: 'https://example.com/hook',
      events: ['agent.completed'],
    })
  })

  it('test calls POST /v1/webhooks/{id}/test', async () => {
    mockHttp.post.mockResolvedValueOnce(undefined)
    await t.webhooks.test('wh_1')

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/webhooks/wh_1/test')
  })

  it('list calls GET /v1/webhooks', async () => {
    mockHttp.get.mockResolvedValueOnce([{ id: 'wh_1' }])
    const result = await t.webhooks.list()

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/webhooks')
    expect(result).toEqual([{ id: 'wh_1' }])
  })

  it('delete calls DELETE /v1/webhooks/{id}', async () => {
    mockHttp.delete.mockResolvedValueOnce(undefined)
    await t.webhooks.delete('wh_1')

    expect(mockHttp.delete).toHaveBeenCalledWith('/v1/webhooks/wh_1')
  })
})

describe('ChannelsNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('chatEmbed adds type to body', async () => {
    mockHttp.post.mockResolvedValueOnce({ id: 'ch_1' })
    await t.channels.chatEmbed({
      agent: 'assistant',
      theme: { primaryColor: '#000', title: 'Chat' },
    })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/channels', expect.objectContaining({
      type: 'chat_embed',
      agent: 'assistant',
    }))
  })

  it('slack adds type to body', async () => {
    mockHttp.post.mockResolvedValueOnce({ id: 'ch_1' })
    await t.channels.slack({
      agent: 'bot',
      workspace: 'ws_1',
      channels: ['general'],
      botName: 'TheazoBot',
    })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/channels', expect.objectContaining({
      type: 'slack',
    }))
  })

  it('list unwraps { data: [...] }', async () => {
    mockHttp.get.mockResolvedValueOnce({ data: [{ id: 'ch_1' }] })
    const result = await t.channels.list()

    expect(result).toEqual([{ id: 'ch_1' }])
  })

  it('disable calls PUT with enabled: false', async () => {
    mockHttp.put.mockResolvedValueOnce({ id: 'ch_1', enabled: false })
    await t.channels.disable('ch_1')

    expect(mockHttp.put).toHaveBeenCalledWith('/v1/channels/ch_1', { enabled: false })
  })

  it('email adds type to body', async () => {
    mockHttp.post.mockResolvedValueOnce({ id: 'ch_1' })
    await t.channels.email({ agent: 'responder', address: 'hi@acme.com' })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/channels', expect.objectContaining({ type: 'email' }))
  })

  it('phone adds type to body', async () => {
    mockHttp.post.mockResolvedValueOnce({ id: 'ch_1' })
    await t.channels.phone({ agent: 'voice', phoneNumber: '+15550100' })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/channels', expect.objectContaining({ type: 'phone' }))
  })

  it('enable calls PUT with enabled: true', async () => {
    mockHttp.put.mockResolvedValueOnce({ id: 'ch_1', enabled: true })
    await t.channels.enable('ch_1')

    expect(mockHttp.put).toHaveBeenCalledWith('/v1/channels/ch_1', { enabled: true })
  })

  it('get calls GET /v1/channels/{id}', async () => {
    mockHttp.get.mockResolvedValueOnce({ id: 'ch_1', type: 'chat_embed' })
    await t.channels.get('ch_1')

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/channels/ch_1')
  })

  it('update calls PUT /v1/channels/{id}', async () => {
    mockHttp.put.mockResolvedValueOnce({ id: 'ch_1' })
    await t.channels.update('ch_1', { config: { theme: '#000' } })

    expect(mockHttp.put).toHaveBeenCalledWith('/v1/channels/ch_1', { config: { theme: '#000' } })
  })

  it('delete calls DELETE /v1/channels/{id}', async () => {
    mockHttp.delete.mockResolvedValueOnce(undefined)
    await t.channels.delete('ch_1')

    expect(mockHttp.delete).toHaveBeenCalledWith('/v1/channels/ch_1')
  })

  it('conversations unwraps { data: [...] }', async () => {
    mockHttp.get.mockResolvedValueOnce({ data: [{ id: 'conv_1' }] })
    const result = await t.channels.conversations('ch_1')

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/channels/ch_1/conversations')
    expect(result).toEqual([{ id: 'conv_1' }])
  })

  it('test calls POST /v1/channels/{id}/test', async () => {
    mockHttp.post.mockResolvedValueOnce({ ok: true, message: 'connected' })
    const result = await t.channels.test('ch_1')

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/channels/ch_1/test')
    expect(result.ok).toBe(true)
  })
})

describe('MCPNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('connect calls POST /v1/mcp/connections', async () => {
    mockHttp.post.mockResolvedValueOnce({ id: 'mcp_1' })
    await t.mcp.connect({ name: 'github', transport: 'sse', url: 'https://mcp.github.com' })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/mcp/connections', expect.objectContaining({
      name: 'github',
      transport: 'sse',
    }))
  })

  it('tools unwraps { data: [...] }', async () => {
    mockHttp.get.mockResolvedValueOnce({ data: [{ name: 'tool1' }] })
    const result = await t.mcp.tools('mcp_1')

    expect(result).toEqual([{ name: 'tool1' }])
  })

  it('setUserCredentials encodes userId in URL', async () => {
    mockHttp.put.mockResolvedValueOnce(undefined)
    await t.mcp.setUserCredentials('mcp_1', 'user@test.com', { headers: { 'X-Key': 'abc' } })

    expect(mockHttp.put).toHaveBeenCalledWith(
      '/v1/mcp/connections/mcp_1/users/user%40test.com/credentials',
      { headers: { 'X-Key': 'abc' } }
    )
  })

  it('serverUrl returns MCP endpoint', () => {
    expect(t.mcp.serverUrl()).toBe('https://mcp.theazo.com/v1')
  })

  it('list unwraps { data: [...] }', async () => {
    mockHttp.get.mockResolvedValueOnce({ data: [{ id: 'mcp_1' }] })
    const result = await t.mcp.list()

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/mcp/connections')
    expect(result).toEqual([{ id: 'mcp_1' }])
  })

  it('get calls GET /v1/mcp/connections/{id}', async () => {
    mockHttp.get.mockResolvedValueOnce({ id: 'mcp_1', status: 'connected' })
    await t.mcp.get('mcp_1')

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/mcp/connections/mcp_1')
  })

  it('refresh unwraps { data: [...] }', async () => {
    mockHttp.post.mockResolvedValueOnce({ data: [{ name: 'tool1' }] })
    const result = await t.mcp.refresh('mcp_1')

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/mcp/connections/mcp_1/refresh')
    expect(result).toEqual([{ name: 'tool1' }])
  })

  it('update calls PUT /v1/mcp/connections/{id}', async () => {
    mockHttp.put.mockResolvedValueOnce({ id: 'mcp_1' })
    await t.mcp.update('mcp_1', { toolFilter: ['tool1'] })

    expect(mockHttp.put).toHaveBeenCalledWith('/v1/mcp/connections/mcp_1', { toolFilter: ['tool1'] })
  })

  it('health calls GET /v1/mcp/connections/{id}/health', async () => {
    mockHttp.get.mockResolvedValueOnce({ status: 'connected', latencyMs: 42 })
    const result = await t.mcp.health('mcp_1')

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/mcp/connections/mcp_1/health')
    expect(result.latencyMs).toBe(42)
  })

  it('disconnect calls DELETE /v1/mcp/connections/{id}', async () => {
    mockHttp.delete.mockResolvedValueOnce(undefined)
    await t.mcp.disconnect('mcp_1')

    expect(mockHttp.delete).toHaveBeenCalledWith('/v1/mcp/connections/mcp_1')
  })

  it('deleteUserCredentials encodes userId in URL', async () => {
    mockHttp.delete.mockResolvedValueOnce(undefined)
    await t.mcp.deleteUserCredentials('mcp_1', 'user@test.com')

    expect(mockHttp.delete).toHaveBeenCalledWith('/v1/mcp/connections/mcp_1/users/user%40test.com/credentials')
  })

  it('serverConfig calls PUT /v1/mcp/server/config', async () => {
    mockHttp.put.mockResolvedValueOnce(undefined)
    await t.mcp.serverConfig({ expose: ['tool1'], auth: 'api_key' })

    expect(mockHttp.put).toHaveBeenCalledWith('/v1/mcp/server/config', { expose: ['tool1'], auth: 'api_key' })
  })

  it('getServerConfig calls GET /v1/mcp/server/config', async () => {
    mockHttp.get.mockResolvedValueOnce({ expose: '*', auth: 'api_key', url: 'https://mcp.theazo.com/v1' })
    const result = await t.mcp.getServerConfig()

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/mcp/server/config')
    expect(result.url).toBe('https://mcp.theazo.com/v1')
  })
})

describe('BillingNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('createCheckout calls POST /v1/billing/checkout', async () => {
    mockHttp.post.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/...' })
    await t.billing.createCheckout({
      plan: 'pro',
      successUrl: 'https://app.com/success',
      cancelUrl: 'https://app.com/cancel',
    })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/billing/checkout', expect.objectContaining({
      plan: 'pro',
    }))
  })

  it('setBudget calls POST /v1/billing/budget', async () => {
    mockHttp.post.mockResolvedValueOnce(undefined)
    await t.billing.setBudget({ monthly: { amount: 10000, currency: 'usd' } })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/billing/budget', {
      monthly: { amount: 10000, currency: 'usd' },
    })
  })

  it('getSubscription calls GET /v1/billing/subscription', async () => {
    mockHttp.get.mockResolvedValueOnce({ id: 'sub_1', plan: 'pro', status: 'active' })
    const result = await t.billing.getSubscription()

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/billing/subscription')
    expect(result?.plan).toBe('pro')
  })

  it('getPortalUrl calls GET /v1/billing/portal', async () => {
    mockHttp.get.mockResolvedValueOnce({ url: 'https://billing.stripe.com/portal' })
    const result = await t.billing.getPortalUrl()

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/billing/portal')
    expect(result.url).toContain('stripe.com')
  })

  it('getBudget calls GET /v1/billing/budget', async () => {
    mockHttp.get.mockResolvedValueOnce({ budget: { amount: 10000, currency: 'usd' }, spent: { amount: 500, currency: 'usd' } })
    const result = await t.billing.getBudget()

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/billing/budget')
    expect(result.spent.amount).toBe(500)
  })

  it('setUserBudget calls POST /v1/billing/user-budget', async () => {
    mockHttp.post.mockResolvedValueOnce(undefined)
    await t.billing.setUserBudget({ monthly: { amount: 5000, currency: 'usd' } })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/billing/user-budget', {
      monthly: { amount: 5000, currency: 'usd' },
    })
  })

  it('getCreditBalance calls GET /v1/billing/credits', async () => {
    mockHttp.get.mockResolvedValueOnce({ credits: 1500, currency: 'usd' })
    const result = await t.billing.getCreditBalance()

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/billing/credits')
    expect(result.credits).toBe(1500)
  })
})

describe('FilesNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('upload base64-encodes file data', async () => {
    mockHttp.post.mockResolvedValueOnce({ id: 'file_1' })
    const fileData = Buffer.from('hello world')
    await t.files.upload({
      userId: 'u1',
      file: fileData,
      filename: 'test.txt',
      purpose: 'agent_input',
    })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/files', expect.objectContaining({
      userId: 'u1',
      filename: 'test.txt',
      purpose: 'agent_input',
      data: fileData.toString('base64'),
    }))
  })

  it('getUrl returns URL string', async () => {
    mockHttp.get.mockResolvedValueOnce({ url: 'https://cdn.theazo.com/file_1' })
    const url = await t.files.getUrl('file_1')

    expect(url).toBe('https://cdn.theazo.com/file_1')
  })

  it('list unwraps { data: [...] }', async () => {
    mockHttp.get.mockResolvedValueOnce({ data: [{ id: 'file_1' }], hasMore: false })
    const result = await t.files.list({ userId: 'u1' })

    expect(result).toEqual([{ id: 'file_1' }])
  })

  it('get calls GET /v1/files/{id}', async () => {
    mockHttp.get.mockResolvedValueOnce({ id: 'file_1', filename: 'test.txt' })
    const result = await t.files.get('file_1')

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/files/file_1')
    expect(result.filename).toBe('test.txt')
  })

  it('delete calls DELETE /v1/files/{id}', async () => {
    mockHttp.delete.mockResolvedValueOnce(undefined)
    await t.files.delete('file_1')

    expect(mockHttp.delete).toHaveBeenCalledWith('/v1/files/file_1')
  })
})

// ─── Previously missing namespaces ──────────────────────────────────

describe('TriggersNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('create calls POST /v1/triggers', async () => {
    mockHttp.post.mockResolvedValueOnce({ id: 'trg_1', url: 'https://api.theazo.com/triggers/trg_1' })
    await t.triggers.create({ name: 'payment', agent: 'classifier', userId: 'u1', type: 'webhook' })

    expect(mockHttp.post).toHaveBeenCalledWith('/v1/triggers', expect.objectContaining({
      name: 'payment',
      type: 'webhook',
    }))
  })

  it('list calls GET /v1/triggers', async () => {
    mockHttp.get.mockResolvedValueOnce([{ id: 'trg_1' }])
    const result = await t.triggers.list()

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/triggers')
    expect(result).toEqual([{ id: 'trg_1' }])
  })

  it('delete calls DELETE /v1/triggers/{id}', async () => {
    mockHttp.delete.mockResolvedValueOnce(undefined)
    await t.triggers.delete('trg_1')

    expect(mockHttp.delete).toHaveBeenCalledWith('/v1/triggers/trg_1')
  })
})

describe('MetricsNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('summary calls GET /v1/metrics/summary', async () => {
    mockHttp.get.mockResolvedValueOnce({ activeAgents: 3, activeSessions: 5, errorRate: 0.02 })
    const result = await t.metrics.summary()

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/metrics/summary')
    expect(result.activeAgents).toBe(3)
  })

  it('query calls GET /v1/metrics with params', async () => {
    mockHttp.get.mockResolvedValueOnce([{ timestamp: '2026-01-01', p50: 100, p95: 200, p99: 300 }])
    await t.metrics.query({ metric: 'latency', since: '2026-01-01', until: '2026-01-07', interval: '1d' })

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/metrics', {
      metric: 'latency',
      since: '2026-01-01',
      until: '2026-01-07',
      interval: '1d',
    })
  })
})

describe('TracesNamespace', () => {
  const t = new Theazo({ apiKey: 'th_test' })

  it('list calls GET /v1/traces with filters', async () => {
    mockHttp.get.mockResolvedValueOnce([{ traceId: 'tr_1', agentId: 'agt_1' }])
    await t.traces.list({ agentId: 'agt_1', limit: 10 })

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/traces', {
      agentId: 'agt_1',
      sessionId: undefined,
      limit: 10,
      cursor: undefined,
    })
  })

  it('get calls GET /v1/traces/{traceId}', async () => {
    mockHttp.get.mockResolvedValueOnce({ traceId: 'tr_1', spans: [] })
    const result = await t.traces.get('tr_1')

    expect(mockHttp.get).toHaveBeenCalledWith('/v1/traces/tr_1')
    expect(result.traceId).toBe('tr_1')
  })
})
