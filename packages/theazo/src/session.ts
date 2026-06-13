import type { HttpClient } from './http.js'
import { Agent } from './agent.js'
import type {
  AgentCreateOpts,
  AgentData,
  AgentListFilters,
  AgentRunOpts,
  FleetDispatchOpts,
  Fleet,
  FleetStatus,
  FleetItemResult,
  FleetResultsFilters,
  KnowledgeUploadOpts,
  KnowledgeUploadFile,
  KnowledgeSyncOpts,
  KnowledgeQueryOpts,
  KnowledgeResult,
  KnowledgeStats,
  KnowledgeSourceData,
  LimitsStatus,
  PaginatedList,
  RunResult,
  SecretInfo,
  SessionData,
  SessionLimits,
  StreamEvent,
  Task,
  TaskListFilters,
  TaskSubmitOpts,
  TaskWaitOpts,
  Team,
  TeamCreateOpts,
  TeamResult,
  UsageReport,
  ChatCreateOpts,
  ChatSendOpts,
  ChatMessageListOpts,
  ChatListOpts,
  ChatUpdateOpts,
  ChatThreadCreateOpts,
  ChatHandoffOpts,
  ChatSearchOpts,
  ChatConversation,
  ChatMessage,
  ChatThread,
  ChatHandoff,
  ChatContextState,
  ChatSearchResult,
  ChatStreamEvent,
  Cost,
} from './types.js'

// ─── Sub-namespace interfaces ───────────────────────────────────────

export interface SessionAgents {
  create(opts: AgentCreateOpts): Promise<Agent>
  list(filters?: AgentListFilters): Promise<Agent[]>
}

export interface SessionFleets {
  dispatch(opts: FleetDispatchOpts): Promise<FleetInstance>
}

export interface SessionTeams {
  create(opts: TeamCreateOpts): Promise<TeamInstance>
}

export interface SessionChat {
  create(opts?: ChatCreateOpts): Promise<ChatConversation>
  list(opts?: ChatListOpts): Promise<{ data: ChatConversation[]; hasMore: boolean }>
  get(conversationId: string): Promise<ChatConversation>
  update(conversationId: string, opts: ChatUpdateOpts): Promise<ChatConversation>
  archive(conversationId: string): Promise<void>
  unarchive(conversationId: string): Promise<void>
  delete(conversationId: string): Promise<void>
  send(conversationId: string, opts: ChatSendOpts): Promise<ChatMessage>
  stream(conversationId: string, opts: ChatSendOpts): AsyncIterable<ChatStreamEvent>
  messages(conversationId: string, opts?: ChatMessageListOpts): Promise<{ data: ChatMessage[]; hasMore: boolean }>
  context(conversationId: string): Promise<ChatContextState>
  injectContext(conversationId: string, opts: { content: string; role: 'system' }): Promise<void>
  createThread(conversationId: string, opts: ChatThreadCreateOpts): Promise<ChatThread>
  threads(conversationId: string): Promise<ChatThread[]>
  handoff(conversationId: string, opts: ChatHandoffOpts): Promise<ChatHandoff>
  resolveHandoff(conversationId: string): Promise<void>
  search(opts: ChatSearchOpts): Promise<ChatSearchResult[]>
}

export interface SessionKnowledge {
  upload(opts: KnowledgeUploadOpts): Promise<void>
  sync(opts: KnowledgeSyncOpts): Promise<void>
  query(q: string, opts?: KnowledgeQueryOpts): Promise<KnowledgeResult[]>
  stats(): Promise<KnowledgeStats>
  deleteCollection(name: string): Promise<void>
  sources(): Promise<KnowledgeSourceData[]>
  deleteSource(id: string): Promise<void>
}

export interface SessionTasks {
  submit(opts: TaskSubmitOpts): Promise<Task>
  get(id: string): Promise<Task>
  list(filters?: TaskListFilters): Promise<Task[]>
  wait(id: string, opts?: TaskWaitOpts): Promise<Task>
  cancel(id: string): Promise<void>
}

export interface SessionSecrets {
  set(kv: Record<string, string>): Promise<void>
  list(): Promise<SecretInfo[]>
  delete(name: string): Promise<void>
}

// ─── Fleet Instance (returned from dispatch) ────────────────────────

export class FleetInstance {
  readonly id: string
  readonly totalItems: number
  private _status: string
  private http: HttpClient

  constructor(data: Fleet, http: HttpClient) {
    this.id = data.id
    this.totalItems = data.totalItems
    this._status = data.status
    this.http = http
  }

  async status(): Promise<FleetStatus> {
    const s = await this.http.get<FleetStatus>(`/v1/fleets/${this.id}/status`)
    this._status = s.status
    return s
  }

  async results(filters?: FleetResultsFilters): Promise<PaginatedList<FleetItemResult>> {
    return this.http.get<PaginatedList<FleetItemResult>>(`/v1/fleets/${this.id}/results`, {
      status: filters?.status,
      limit: filters?.limit,
      cursor: filters?.cursor,
    })
  }

  async *stream(): AsyncIterable<FleetItemResult> {
    yield* this.http.stream<FleetItemResult>(`/v1/fleets/${this.id}/stream`)
  }

  async cancel(): Promise<void> {
    await this.http.post(`/v1/fleets/${this.id}/cancel`)
    this._status = 'cancelled'
  }

  get currentStatus(): string {
    return this._status
  }
}

// ─── Team Instance (returned from create) ───────────────────────────

export class TeamInstance {
  readonly id: string
  readonly name: string
  private http: HttpClient

  constructor(data: Team, http: HttpClient) {
    this.id = data.id
    this.name = data.name
    this.http = http
  }

  async run(task: string): Promise<TeamResult> {
    return this.http.post<TeamResult>(`/v1/teams/${this.id}/run`, { task })
  }

  async cancel(): Promise<void> {
    await this.http.post(`/v1/teams/${this.id}/cancel`)
  }
}

// ─── Session Class ──────────────────────────────────────────────────

export class Session {
  readonly id: string
  readonly userId: string
  readonly metadata: Record<string, string>
  readonly createdAt: string

  private _status: string
  private _limits: SessionLimits
  private _pausedAt: string | null
  private _terminatedAt: string | null
  private http: HttpClient

  constructor(data: SessionData, http: HttpClient) {
    this.id = data.id
    this.userId = data.userId
    this._status = data.status
    this.metadata = data.metadata
    this._limits = data.limits
    this.createdAt = data.createdAt
    this._pausedAt = data.pausedAt
    this._terminatedAt = data.terminatedAt
    this.http = http
  }

  get status(): string {
    return this._status
  }

  get pausedAt(): string | null {
    return this._pausedAt
  }

  get terminatedAt(): string | null {
    return this._terminatedAt
  }

  // ─── One-shot convenience ───────────────────────────────────────

  async run(agent: string, task: string, opts?: AgentRunOpts): Promise<RunResult> {
    return this.http.post<RunResult>(`/v1/sessions/${this.id}/run`, {
      agent,
      task,
      ...opts,
    })
  }

  // ─── Agents namespace ──────────────────────────────────────────

  readonly agents: SessionAgents = {
    create: async (opts: AgentCreateOpts): Promise<Agent> => {
      const data = await this.http.post<AgentData>(`/v1/sessions/${this.id}/agents`, opts)
      return new Agent(data, this.http)
    },
    list: async (filters?: AgentListFilters): Promise<Agent[]> => {
      const data = await this.http.get<AgentData[]>(`/v1/sessions/${this.id}/agents`, {
        status: filters?.status,
        provider: filters?.provider,
        compute: filters?.compute,
        limit: filters?.limit,
        cursor: filters?.cursor,
      })
      return data.map(d => new Agent(d, this.http))
    },
  }

  // ─── Fleets namespace ──────────────────────────────────────────

  readonly fleets: SessionFleets = {
    dispatch: async (opts: FleetDispatchOpts): Promise<FleetInstance> => {
      const data = await this.http.post<Fleet>(`/v1/sessions/${this.id}/fleets`, opts)
      return new FleetInstance(data, this.http)
    },
  }

  // ─── Teams namespace ───────────────────────────────────────────

  readonly teams: SessionTeams = {
    create: async (opts: TeamCreateOpts): Promise<TeamInstance> => {
      const data = await this.http.post<Team>(`/v1/sessions/${this.id}/teams`, opts)
      return new TeamInstance(data, this.http)
    },
  }

  // ─── Knowledge namespace ───────────────────────────────────────

  readonly knowledge: SessionKnowledge = {
    upload: async (opts: KnowledgeUploadOpts): Promise<void> => {
      await this.http.post(`/v1/knowledge/upload`, {
        userId: this.userId,
        collection: opts.collection,
        files: opts.files.map((f: KnowledgeUploadFile) => ({
          filename: f.filename,
          data: Buffer.from(f.content).toString('base64'),
          mimeType: f.mimeType,
        })),
      })
    },
    sync: async (opts: KnowledgeSyncOpts): Promise<void> => {
      await this.http.post(`/v1/knowledge/sync`, {
        userId: this.userId,
        source: opts.source,
        collection: opts.collection,
        syncSchedule: opts.schedule,
      })
    },
    query: async (q: string, opts?: KnowledgeQueryOpts): Promise<KnowledgeResult[]> => {
      const result = await this.http.post<{ data: KnowledgeResult[] }>(`/v1/knowledge/query`, {
        userId: this.userId,
        query: q,
        collection: opts?.collection,
        topK: opts?.topK,
      })
      return result.data
    },
    stats: async (): Promise<KnowledgeStats> => {
      return this.http.get<KnowledgeStats>(`/v1/knowledge/stats`, { userId: this.userId })
    },
    deleteCollection: async (name: string): Promise<void> => {
      await this.http.delete(`/v1/knowledge/collections/${encodeURIComponent(name)}?userId=${encodeURIComponent(this.userId)}`)
    },
    sources: async (): Promise<KnowledgeSourceData[]> => {
      const result = await this.http.get<{ data: KnowledgeSourceData[] }>(`/v1/knowledge/sources`, { userId: this.userId })
      return result.data
    },
    deleteSource: async (id: string): Promise<void> => {
      await this.http.delete(`/v1/knowledge/sources/${id}?userId=${encodeURIComponent(this.userId)}`)
    },
  }

  // ─── Tasks namespace ───────────────────────────────────────────

  readonly tasks: SessionTasks = {
    submit: async (opts: TaskSubmitOpts): Promise<Task> => {
      return this.http.post<Task>(`/v1/sessions/${this.id}/tasks`, opts)
    },
    get: async (id: string): Promise<Task> => {
      return this.http.get<Task>(`/v1/sessions/${this.id}/tasks/${id}`)
    },
    list: async (filters?: TaskListFilters): Promise<Task[]> => {
      return this.http.get<Task[]>(`/v1/sessions/${this.id}/tasks`, {
        status: filters?.status,
      })
    },
    wait: async (id: string, opts?: TaskWaitOpts): Promise<Task> => {
      return this.http.get<Task>(`/v1/sessions/${this.id}/tasks/${id}/wait`, {
        timeout: opts?.timeout,
      })
    },
    cancel: async (id: string): Promise<void> => {
      await this.http.post(`/v1/sessions/${this.id}/tasks/${id}/cancel`)
    },
  }

  // ─── Secrets namespace ─────────────────────────────────────────

  readonly secrets: SessionSecrets = {
    set: async (kv: Record<string, string>): Promise<void> => {
      await this.http.post(`/v1/sessions/${this.id}/secrets`, kv)
    },
    list: async (): Promise<SecretInfo[]> => {
      return this.http.get<SecretInfo[]>(`/v1/sessions/${this.id}/secrets`)
    },
    delete: async (name: string): Promise<void> => {
      await this.http.delete(`/v1/sessions/${this.id}/secrets/${encodeURIComponent(name)}`)
    },
  }

  // ─── Chat namespace ───────────────────────────────────────────

  readonly chat: SessionChat = {
    create: async (opts?: ChatCreateOpts): Promise<ChatConversation> => {
      return this.http.post<ChatConversation>(`/v1/sessions/${this.id}/chat`, opts ?? {})
    },
    list: async (opts?: ChatListOpts): Promise<{ data: ChatConversation[]; hasMore: boolean }> => {
      return this.http.get(`/v1/sessions/${this.id}/chat`, {
        status: opts?.status,
        limit: opts?.limit,
        cursor: opts?.cursor,
      })
    },
    get: async (conversationId: string): Promise<ChatConversation> => {
      return this.http.get<ChatConversation>(`/v1/chat/${conversationId}`)
    },
    update: async (conversationId: string, opts: ChatUpdateOpts): Promise<ChatConversation> => {
      return this.http.put<ChatConversation>(`/v1/chat/${conversationId}`, opts)
    },
    archive: async (conversationId: string): Promise<void> => {
      await this.http.post(`/v1/chat/${conversationId}/archive`)
    },
    unarchive: async (conversationId: string): Promise<void> => {
      await this.http.post(`/v1/chat/${conversationId}/unarchive`)
    },
    delete: async (conversationId: string): Promise<void> => {
      await this.http.delete(`/v1/chat/${conversationId}`)
    },
    send: async (conversationId: string, opts: ChatSendOpts): Promise<ChatMessage> => {
      return this.http.post<ChatMessage>(`/v1/chat/${conversationId}/messages`, opts)
    },
    stream: (conversationId: string, opts: ChatSendOpts & { signal?: AbortSignal }): AsyncIterable<ChatStreamEvent> => {
      const { signal, ...body } = opts
      return this.http.streamPost<ChatStreamEvent>(`/v1/chat/${conversationId}/messages/stream`, body, signal)
    },
    messages: async (conversationId: string, opts?: ChatMessageListOpts): Promise<{ data: ChatMessage[]; hasMore: boolean }> => {
      return this.http.get(`/v1/chat/${conversationId}/messages`, {
        limit: opts?.limit,
        cursor: opts?.cursor,
        order: opts?.order,
      })
    },
    context: async (conversationId: string): Promise<ChatContextState> => {
      return this.http.get<ChatContextState>(`/v1/chat/${conversationId}/context`)
    },
    injectContext: async (conversationId: string, opts: { content: string; role: 'system' }): Promise<void> => {
      await this.http.post(`/v1/chat/${conversationId}/context`, opts)
    },
    createThread: async (conversationId: string, opts: ChatThreadCreateOpts): Promise<ChatThread> => {
      return this.http.post<ChatThread>(`/v1/chat/${conversationId}/threads`, opts)
    },
    threads: async (conversationId: string): Promise<ChatThread[]> => {
      const res = await this.http.get<{ data: ChatThread[] }>(`/v1/chat/${conversationId}/threads`)
      return res.data
    },
    handoff: async (conversationId: string, opts: ChatHandoffOpts): Promise<ChatHandoff> => {
      return this.http.post<ChatHandoff>(`/v1/chat/${conversationId}/handoff`, opts)
    },
    resolveHandoff: async (conversationId: string): Promise<void> => {
      await this.http.post(`/v1/chat/${conversationId}/handoff/resolve`)
    },
    search: async (opts: ChatSearchOpts): Promise<ChatSearchResult[]> => {
      const res = await this.http.post<{ data: ChatSearchResult[] }>(`/v1/chat/search`, opts)
      return res.data
    },
  }

  // ─── Usage & Limits ────────────────────────────────────────────

  async usage(): Promise<UsageReport> {
    return this.http.get<UsageReport>(`/v1/sessions/${this.id}/usage`)
  }

  async limits(): Promise<LimitsStatus> {
    return this.http.get<LimitsStatus>(`/v1/sessions/${this.id}/limits`)
  }

  async updateLimits(limits: Partial<SessionLimits>): Promise<void> {
    await this.http.patch(`/v1/sessions/${this.id}/limits`, limits)
    this._limits = { ...this._limits, ...limits }
  }

  // ─── Lifecycle ─────────────────────────────────────────────────

  async pause(): Promise<void> {
    await this.http.post(`/v1/sessions/${this.id}/pause`)
    this._status = 'paused'
  }

  async resume(): Promise<void> {
    await this.http.post(`/v1/sessions/${this.id}/resume`)
    this._status = 'active'
  }

  async terminate(): Promise<void> {
    await this.http.post(`/v1/sessions/${this.id}/terminate`)
    this._status = 'terminated'
  }
}
