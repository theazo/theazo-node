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
})
