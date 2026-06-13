import { HttpClient } from './http.js'
import { Session } from './session.js'
import { Agent } from './agent.js'
import type {
  AgentData,
  AgentDefinition,
  AgentDefinitionOpts,
  AgentDefinitionUpdate,
  AgentDefinitionVersion,
  AgentListFilters,
  ApiKey,
  ApiKeyCreateOpts,
  ApiKeyCreated,
  Approval,
  ApprovalListFilters,
  ApproveOpts,
  DailyUsage,
  DailyUsageOpts,
  DenyOpts,
  GuardrailConfig,
  GuardrailViolation,
  GuardrailViolationFilters,
  LogEntry,
  LogQueryFilters,
  LogStreamFilters,
  MetricDataPoint,
  MetricQueryOpts,
  MetricsSummary,
  PaginatedList,
  ProviderUsage,
  ProviderUsageOpts,
  Schedule,
  ScheduleCreateOpts,
  ScheduleExecution,
  SessionCreateOpts,
  SessionData,
  SessionListFilters,
  TheazoConfig,
  Tool,
  ToolRegisterOpts,
  ToolResult,
  Trace,
  TraceDetail,
  TraceListFilters,
  Trigger,
  TriggerCreateOpts,
  UsageExportOpts,
  UsageSummary,
  UsageSummaryOpts,
  UserUsage,
  UserUsageOpts,
  Webhook,
  WebhookCreateOpts,
  FileData,
  FileListFilters,
  FileUploadOpts,
  MCPConnectOpts,
  MCPConnection,
  MCPTool,
  MCPHealth,
  MCPUpdateOpts,
  MCPUserCredentialsOpts,
  MCPServerConfig,
  MCPServerConfigResponse,
  Channel,
  ChatEmbedCreateOpts,
  SlackCreateOpts,
  EmailCreateOpts,
  PhoneCreateOpts,
  ChannelUpdateOpts,
  ChannelConversation,
  BillingPlan,
  BillingSubscription,
  BillingBudgetConfig,
  BillingBudgetStatus,
  BillingCheckoutOpts,
} from './types.js'

const DEFAULT_BASE_URL = 'https://api.theazo.com'

// ─── Platform-scoped namespace classes ──────────────────────────────

class SessionsNamespace {
  constructor(private http: HttpClient) {}

  async create(opts: SessionCreateOpts): Promise<Session> {
    const data = await this.http.post<SessionData>('/v1/sessions', opts)
    return new Session(data, this.http)
  }

  async get(id: string): Promise<Session> {
    const data = await this.http.get<SessionData>(`/v1/sessions/${id}`)
    return new Session(data, this.http)
  }

  async forUser(userId: string, opts?: { limits?: SessionCreateOpts['limits']; metadata?: Record<string, string> }): Promise<Session> {
    const data = await this.http.post<SessionData>(`/v1/sessions/by-user/${encodeURIComponent(userId)}`, opts)
    return new Session(data, this.http)
  }

  async list(filters?: SessionListFilters): Promise<PaginatedList<Session>> {
    const result = await this.http.get<PaginatedList<SessionData>>('/v1/sessions', {
      status: filters?.status,
      createdAfter: filters?.createdAfter,
      limit: filters?.limit,
      cursor: filters?.cursor,
    })
    return {
      data: result.data.map(d => new Session(d, this.http)),
      hasMore: result.hasMore,
      cursor: result.cursor,
    }
  }
}

class AgentsNamespace {
  constructor(private http: HttpClient) {}

  async define(opts: AgentDefinitionOpts): Promise<AgentDefinition> {
    return this.http.post<AgentDefinition>('/v1/agents/definitions', opts)
  }

  async definitions(): Promise<AgentDefinition[]> {
    return this.http.get<AgentDefinition[]>('/v1/agents/definitions')
  }

  async updateDefinition(id: string, opts: AgentDefinitionUpdate): Promise<AgentDefinition> {
    return this.http.patch<AgentDefinition>(`/v1/agents/definitions/${id}`, opts)
  }

  async rollback(id: string, opts: { version: number }): Promise<void> {
    await this.http.post(`/v1/agents/definitions/${id}/rollback`, opts)
  }

  async versions(id: string): Promise<AgentDefinitionVersion[]> {
    return this.http.get<AgentDefinitionVersion[]>(`/v1/agents/definitions/${id}/versions`)
  }

  async get(id: string): Promise<Agent> {
    const data = await this.http.get<AgentData>(`/v1/agents/${id}`)
    return new Agent(data, this.http)
  }

  async list(filters?: AgentListFilters): Promise<PaginatedList<Agent>> {
    const result = await this.http.get<PaginatedList<AgentData>>('/v1/agents', {
      status: filters?.status,
      provider: filters?.provider,
      compute: filters?.compute,
      limit: filters?.limit,
      cursor: filters?.cursor,
    })
    return {
      data: result.data.map(d => new Agent(d, this.http)),
      hasMore: result.hasMore,
      cursor: result.cursor,
    }
  }
}

class WorkflowsNamespace {
  constructor(private http: HttpClient) {}

  async create(definition: import('./types.js').WorkflowCreateOpts): Promise<import('./types.js').Workflow> {
    return this.http.post('/v1/workflows', definition)
  }

  async list(): Promise<import('./types.js').Workflow[]> {
    return this.http.get('/v1/workflows')
  }

  async get(id: string): Promise<import('./types.js').Workflow> {
    return this.http.get(`/v1/workflows/${id}`)
  }

  async update(id: string, opts: Partial<import('./types.js').WorkflowCreateOpts>): Promise<import('./types.js').Workflow> {
    return this.http.patch(`/v1/workflows/${id}`, opts)
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/v1/workflows/${id}`)
  }

  async run(workflowId: string, opts: import('./types.js').WorkflowRunOpts): Promise<import('./types.js').WorkflowRun> {
    return this.http.post(`/v1/workflows/${workflowId}/runs`, opts)
  }

  async getRun(runId: string): Promise<import('./types.js').WorkflowRun> {
    return this.http.get(`/v1/workflow-runs/${runId}`)
  }

  async runs(filters?: import('./types.js').WorkflowRunFilters): Promise<PaginatedList<import('./types.js').WorkflowRun>> {
    return this.http.get('/v1/workflow-runs', {
      workflowId: filters?.workflowId,
      status: filters?.status,
      limit: filters?.limit,
      cursor: filters?.cursor,
    })
  }

  async cancelRun(runId: string): Promise<void> {
    await this.http.post(`/v1/workflow-runs/${runId}/cancel`)
  }

  async retryRun(runId: string): Promise<void> {
    await this.http.post(`/v1/workflow-runs/${runId}/retry`)
  }

  async *streamRun(runId: string): AsyncIterable<import('./types.js').WorkflowStreamEvent> {
    yield* this.http.stream<import('./types.js').WorkflowStreamEvent>(`/v1/workflow-runs/${runId}/stream`)
  }

  async estimate(workflowId: string, opts?: { input?: Record<string, unknown> }): Promise<import('./types.js').WorkflowEstimate> {
    return this.http.post(`/v1/workflows/${workflowId}/estimate`, opts ?? {})
  }

  async schedule(id: string, opts: import('./types.js').WorkflowScheduleOpts): Promise<Schedule> {
    return this.http.post(`/v1/workflows/${id}/schedule`, opts)
  }
}

class ApprovalsNamespace {
  constructor(private http: HttpClient) {}

  async list(filters?: ApprovalListFilters): Promise<Approval[]> {
    return this.http.get<Approval[]>('/v1/approvals', {
      sessionId: filters?.sessionId,
      status: filters?.status,
    })
  }

  async get(id: string): Promise<Approval> {
    return this.http.get<Approval>(`/v1/approvals/${id}`)
  }

  async approve(id: string, opts?: ApproveOpts): Promise<void> {
    await this.http.post(`/v1/approvals/${id}/approve`, opts)
  }

  async deny(id: string, opts?: DenyOpts): Promise<void> {
    await this.http.post(`/v1/approvals/${id}/deny`, opts)
  }

  async bulkApprove(ids: string[]): Promise<void> {
    await this.http.post('/v1/approvals/bulk-approve', { ids })
  }

  async bulkDeny(ids: string[]): Promise<void> {
    await this.http.post('/v1/approvals/bulk-deny', { ids })
  }
}

class SchedulesNamespace {
  constructor(private http: HttpClient) {}

  async create(opts: ScheduleCreateOpts): Promise<Schedule> {
    return this.http.post<Schedule>('/v1/schedules', opts)
  }

  async list(): Promise<Schedule[]> {
    return this.http.get<Schedule[]>('/v1/schedules')
  }

  async pause(id: string): Promise<void> {
    await this.http.post(`/v1/schedules/${id}/pause`)
  }

  async resume(id: string): Promise<void> {
    await this.http.post(`/v1/schedules/${id}/resume`)
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/v1/schedules/${id}`)
  }

  async history(id: string): Promise<ScheduleExecution[]> {
    return this.http.get<ScheduleExecution[]>(`/v1/schedules/${id}/history`)
  }
}

class TriggersNamespace {
  constructor(private http: HttpClient) {}

  async create(opts: TriggerCreateOpts): Promise<Trigger> {
    return this.http.post<Trigger>('/v1/triggers', opts)
  }

  async list(): Promise<Trigger[]> {
    return this.http.get<Trigger[]>('/v1/triggers')
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/v1/triggers/${id}`)
  }
}

class ToolsNamespace {
  constructor(private http: HttpClient) {}

  async register(opts: ToolRegisterOpts): Promise<Tool> {
    return this.http.post<Tool>('/v1/tools', opts)
  }

  async list(): Promise<Tool[]> {
    return this.http.get<Tool[]>('/v1/tools')
  }

  async test(name: string, input: Record<string, unknown>): Promise<ToolResult> {
    return this.http.post<ToolResult>(`/v1/tools/${encodeURIComponent(name)}/test`, input)
  }

  async delete(name: string): Promise<void> {
    await this.http.delete(`/v1/tools/${encodeURIComponent(name)}`)
  }
}

class LogsNamespace {
  constructor(private http: HttpClient) {}

  async query(filters?: LogQueryFilters): Promise<LogEntry[]> {
    return this.http.get<LogEntry[]>('/v1/logs', {
      sessionId: filters?.sessionId,
      agentId: filters?.agentId,
      level: filters?.level,
      search: filters?.search,
      since: filters?.since,
      until: filters?.until,
      limit: filters?.limit,
    })
  }

  async *stream(filters?: LogStreamFilters): AsyncIterable<LogEntry> {
    yield* this.http.stream<LogEntry>('/v1/logs/stream', {
      sessionId: filters?.sessionId,
      agentId: filters?.agentId,
      level: filters?.level,
    })
  }
}

class MetricsNamespace {
  constructor(private http: HttpClient) {}

  async summary(): Promise<MetricsSummary> {
    return this.http.get<MetricsSummary>('/v1/metrics/summary')
  }

  async query(opts: MetricQueryOpts): Promise<MetricDataPoint[]> {
    return this.http.get<MetricDataPoint[]>('/v1/metrics', {
      metric: opts.metric,
      since: opts.since,
      until: opts.until,
      interval: opts.interval,
    })
  }
}

class TracesNamespace {
  constructor(private http: HttpClient) {}

  async list(filters?: TraceListFilters): Promise<Trace[]> {
    return this.http.get<Trace[]>('/v1/traces', {
      agentId: filters?.agentId,
      sessionId: filters?.sessionId,
      limit: filters?.limit,
      cursor: filters?.cursor,
    })
  }

  async get(traceId: string): Promise<TraceDetail> {
    return this.http.get<TraceDetail>(`/v1/traces/${traceId}`)
  }
}

class UsageNamespace {
  constructor(private http: HttpClient) {}

  async summary(opts?: UsageSummaryOpts): Promise<UsageSummary> {
    return this.http.get<UsageSummary>('/v1/usage/summary', {
      period: opts?.period,
    })
  }

  async forUser(userId: string, opts?: UserUsageOpts): Promise<UserUsage> {
    return this.http.get<UserUsage>(`/v1/usage/users/${encodeURIComponent(userId)}`, {
      period: opts?.period,
    })
  }

  async daily(opts?: DailyUsageOpts): Promise<DailyUsage[]> {
    return this.http.get<DailyUsage[]>('/v1/usage/daily', {
      period: opts?.period,
    })
  }

  async byProvider(opts?: ProviderUsageOpts): Promise<ProviderUsage> {
    return this.http.get<ProviderUsage>('/v1/usage/by-provider', {
      period: opts?.period,
    })
  }

  async export(opts: UsageExportOpts): Promise<unknown> {
    return this.http.get('/v1/usage/export', {
      period: opts.period,
      format: opts.format,
    })
  }
}

class GuardrailsNamespace {
  constructor(private http: HttpClient) {}

  async configure(opts: GuardrailConfig): Promise<void> {
    await this.http.post('/v1/guardrails', opts)
  }

  async get(): Promise<GuardrailConfig> {
    return this.http.get<GuardrailConfig>('/v1/guardrails')
  }

  async violations(filters?: GuardrailViolationFilters): Promise<GuardrailViolation[]> {
    return this.http.get<GuardrailViolation[]>('/v1/guardrails/violations', {
      period: filters?.period,
    })
  }
}

class WebhooksNamespace {
  constructor(private http: HttpClient) {}

  async create(opts: WebhookCreateOpts): Promise<Webhook> {
    return this.http.post<Webhook>('/v1/webhooks', opts)
  }

  async list(): Promise<Webhook[]> {
    return this.http.get<Webhook[]>('/v1/webhooks')
  }

  async test(id: string): Promise<void> {
    await this.http.post(`/v1/webhooks/${id}/test`)
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/v1/webhooks/${id}`)
  }
}

class ChannelsNamespace {
  constructor(private http: HttpClient) {}

  async chatEmbed(opts: ChatEmbedCreateOpts): Promise<Channel> {
    return this.http.post<Channel>('/v1/channels', { type: 'chat_embed', ...opts })
  }

  async slack(opts: SlackCreateOpts): Promise<Channel> {
    return this.http.post<Channel>('/v1/channels', { type: 'slack', ...opts })
  }

  async email(opts: EmailCreateOpts): Promise<Channel> {
    return this.http.post<Channel>('/v1/channels', { type: 'email', ...opts })
  }

  async phone(opts: PhoneCreateOpts): Promise<Channel> {
    return this.http.post<Channel>('/v1/channels', { type: 'phone', ...opts })
  }

  async list(): Promise<Channel[]> {
    const result = await this.http.get<{ data: Channel[] }>('/v1/channels')
    return result.data
  }

  async get(id: string): Promise<Channel> {
    return this.http.get<Channel>(`/v1/channels/${id}`)
  }

  async update(id: string, opts: ChannelUpdateOpts): Promise<Channel> {
    return this.http.put<Channel>(`/v1/channels/${id}`, opts)
  }

  async disable(id: string): Promise<Channel> {
    return this.http.put<Channel>(`/v1/channels/${id}`, { enabled: false })
  }

  async enable(id: string): Promise<Channel> {
    return this.http.put<Channel>(`/v1/channels/${id}`, { enabled: true })
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/v1/channels/${id}`)
  }

  async conversations(id: string): Promise<ChannelConversation[]> {
    const result = await this.http.get<{ data: ChannelConversation[] }>(`/v1/channels/${id}/conversations`)
    return result.data
  }

  async test(id: string): Promise<{ ok: boolean; message: string }> {
    return this.http.post(`/v1/channels/${id}/test`)
  }
}

class MCPNamespace {
  constructor(private http: HttpClient) {}

  async connect(opts: MCPConnectOpts): Promise<MCPConnection> {
    return this.http.post<MCPConnection>('/v1/mcp/connections', opts)
  }

  async list(): Promise<MCPConnection[]> {
    const result = await this.http.get<{ data: MCPConnection[] }>('/v1/mcp/connections')
    return result.data
  }

  async get(id: string): Promise<MCPConnection> {
    return this.http.get<MCPConnection>(`/v1/mcp/connections/${id}`)
  }

  async tools(id: string): Promise<MCPTool[]> {
    const result = await this.http.get<{ data: MCPTool[] }>(`/v1/mcp/connections/${id}/tools`)
    return result.data
  }

  async refresh(id: string): Promise<MCPTool[]> {
    const result = await this.http.post<{ data: MCPTool[] }>(`/v1/mcp/connections/${id}/refresh`)
    return result.data
  }

  async update(id: string, opts: MCPUpdateOpts): Promise<MCPConnection> {
    return this.http.put<MCPConnection>(`/v1/mcp/connections/${id}`, opts)
  }

  async health(id: string): Promise<MCPHealth> {
    return this.http.get<MCPHealth>(`/v1/mcp/connections/${id}/health`)
  }

  async disconnect(id: string): Promise<void> {
    await this.http.delete(`/v1/mcp/connections/${id}`)
  }

  async setUserCredentials(connectionId: string, userId: string, opts: MCPUserCredentialsOpts): Promise<void> {
    await this.http.put(`/v1/mcp/connections/${connectionId}/users/${encodeURIComponent(userId)}/credentials`, opts)
  }

  async deleteUserCredentials(connectionId: string, userId: string): Promise<void> {
    await this.http.delete(`/v1/mcp/connections/${connectionId}/users/${encodeURIComponent(userId)}/credentials`)
  }

  serverUrl(): string {
    // In production this would use the platform's API key to construct the URL
    return 'https://mcp.theazo.com/v1'
  }

  async serverConfig(config: MCPServerConfig): Promise<void> {
    await this.http.put('/v1/mcp/server/config', config)
  }

  async getServerConfig(): Promise<MCPServerConfigResponse> {
    return this.http.get<MCPServerConfigResponse>('/v1/mcp/server/config')
  }
}

class FilesNamespace {
  constructor(private http: HttpClient) {}

  async upload(opts: FileUploadOpts): Promise<FileData> {
    return this.http.post<FileData>('/v1/files', {
      userId: opts.userId,
      filename: opts.filename,
      purpose: opts.purpose,
      data: Buffer.from(opts.file).toString('base64'),
      ...(opts.autoIngest !== undefined ? { autoIngest: opts.autoIngest } : {}),
      ...(opts.collection ? { collection: opts.collection } : {}),
    })
  }

  async get(id: string): Promise<FileData> {
    return this.http.get<FileData>(`/v1/files/${id}`)
  }

  async list(filters?: FileListFilters): Promise<FileData[]> {
    const result = await this.http.get<{ data: FileData[]; hasMore: boolean }>('/v1/files', {
      userId: filters?.userId,
      purpose: filters?.purpose,
      agentId: filters?.agentId,
      sessionId: filters?.sessionId,
    })
    return result.data
  }

  async getUrl(id: string, opts?: { expiresIn?: string }): Promise<string> {
    const result = await this.http.get<{ url: string }>(`/v1/files/${id}/url`, {
      expiresIn: opts?.expiresIn,
    })
    return result.url
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/v1/files/${id}`)
  }
}

class BillingNamespace {
  constructor(private http: HttpClient) {}

  async getSubscription(): Promise<BillingSubscription | null> {
    return this.http.get<BillingSubscription | null>('/v1/billing/subscription')
  }

  async createCheckout(opts: BillingCheckoutOpts): Promise<{ url: string }> {
    return this.http.post<{ url: string }>('/v1/billing/checkout', opts)
  }

  async getPortalUrl(): Promise<{ url: string }> {
    return this.http.get<{ url: string }>('/v1/billing/portal')
  }

  async setBudget(config: BillingBudgetConfig): Promise<void> {
    await this.http.post('/v1/billing/budget', config)
  }

  async getBudget(): Promise<BillingBudgetStatus> {
    return this.http.get<BillingBudgetStatus>('/v1/billing/budget')
  }

  async setUserBudget(config: BillingBudgetConfig): Promise<void> {
    await this.http.post('/v1/billing/user-budget', config)
  }

  async getCreditBalance(): Promise<{ credits: number; currency: string }> {
    return this.http.get<{ credits: number; currency: string }>('/v1/billing/credits')
  }
}

// ─── Main Theazo Class ──────────────────────────────────────────────

export class Theazo {
  private http: HttpClient

  readonly sessions: SessionsNamespace
  readonly agents: AgentsNamespace
  readonly workflows: WorkflowsNamespace
  readonly approvals: ApprovalsNamespace
  readonly schedules: SchedulesNamespace
  readonly triggers: TriggersNamespace
  readonly tools: ToolsNamespace
  readonly logs: LogsNamespace
  readonly metrics: MetricsNamespace
  readonly traces: TracesNamespace
  readonly usage: UsageNamespace
  readonly billing: BillingNamespace
  readonly guardrails: GuardrailsNamespace
  readonly webhooks: WebhooksNamespace
  readonly mcp: MCPNamespace
  readonly channels: ChannelsNamespace
  readonly files: FilesNamespace

  constructor(config: TheazoConfig) {
    if (!config.apiKey) {
      throw new Error('apiKey is required')
    }

    this.http = new HttpClient({
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      apiKey: config.apiKey,
    })

    this.sessions = new SessionsNamespace(this.http)
    this.agents = new AgentsNamespace(this.http)
    this.workflows = new WorkflowsNamespace(this.http)
    this.approvals = new ApprovalsNamespace(this.http)
    this.schedules = new SchedulesNamespace(this.http)
    this.triggers = new TriggersNamespace(this.http)
    this.tools = new ToolsNamespace(this.http)
    this.logs = new LogsNamespace(this.http)
    this.metrics = new MetricsNamespace(this.http)
    this.traces = new TracesNamespace(this.http)
    this.usage = new UsageNamespace(this.http)
    this.billing = new BillingNamespace(this.http)
    this.guardrails = new GuardrailsNamespace(this.http)
    this.webhooks = new WebhooksNamespace(this.http)
    this.mcp = new MCPNamespace(this.http)
    this.channels = new ChannelsNamespace(this.http)
    this.files = new FilesNamespace(this.http)
  }
}

// ─── Re-exports ─────────────────────────────────────────────────────

export { TheazoError } from './errors.js'
export type { TheazoErrorCode } from './errors.js'
export { Session } from './session.js'
export { FleetInstance, TeamInstance } from './session.js'
export { Agent } from './agent.js'
export { workflow, WorkflowBuilder } from './workflow-builder.js'
export type * from './types.js'
