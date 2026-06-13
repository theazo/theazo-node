import type { HttpClient } from './http.js'
import type {
  AgentData,
  AgentStatusInfo,
  ExecResult,
  FileEntry,
  RunResult,
  RunOpts,
  Snapshot,
  StreamEvent,
  ResumeOpts,
  SendInputOpts,
  AgentProgressData,
  CheckpointData,
  CheckpointCreateOpts,
} from './types.js'

export interface AgentFiles {
  write(path: string, data: Buffer | Uint8Array | string): Promise<void>
  read(path: string): Promise<Buffer>
  list(dir?: string): Promise<FileEntry[]>
}

export interface AgentPorts {
  expose(port: number): Promise<string>
}

export class Agent {
  readonly id: string
  readonly sessionId: string
  readonly userId: string
  readonly provider: string
  readonly compute: string
  readonly model: string
  readonly browser: boolean
  readonly region: string
  readonly createdAt: string

  private _status: string
  private http: HttpClient

  constructor(data: AgentData, http: HttpClient) {
    this.id = data.id
    this.sessionId = data.sessionId
    this.userId = data.userId
    this._status = data.status
    this.provider = data.provider
    this.compute = data.compute
    this.model = data.model
    this.browser = data.browser
    this.region = data.region
    this.createdAt = data.createdAt
    this.http = http
  }

  async run(task: string, opts?: RunOpts): Promise<RunResult> {
    return this.http.post<RunResult>(`/v1/agents/${this.id}/run`, {
      task,
      ...(opts?.maxCost ? { maxCost: opts.maxCost } : {}),
    })
  }

  async *stream(task: string): AsyncIterable<StreamEvent> {
    // POST to start the stream, then read SSE
    await this.http.post(`/v1/agents/${this.id}/run`, { task, stream: true })
    yield* this.http.stream<StreamEvent>(`/v1/agents/${this.id}/stream`)
  }

  async exec(lang: string, code: string): Promise<ExecResult> {
    return this.http.post<ExecResult>(`/v1/agents/${this.id}/exec`, { lang, code })
  }

  readonly files: AgentFiles = {
    write: async (path: string, data: Buffer | Uint8Array | string): Promise<void> => {
      const encoded = typeof data === 'string' ? data : Buffer.from(data).toString('base64')
      await this.http.post(`/v1/agents/${this.id}/files`, {
        path,
        data: encoded,
        encoding: typeof data === 'string' ? 'utf-8' : 'base64',
      })
    },
    read: async (path: string): Promise<Buffer> => {
      const result = await this.http.get<{ data: string; encoding: string }>(
        `/v1/agents/${this.id}/files`,
        { path }
      )
      return result.encoding === 'base64'
        ? Buffer.from(result.data, 'base64')
        : Buffer.from(result.data, 'utf-8')
    },
    list: async (dir?: string): Promise<FileEntry[]> => {
      return this.http.get<FileEntry[]>(`/v1/agents/${this.id}/files/list`, {
        dir: dir ?? '/data',
      })
    },
  }

  readonly ports: AgentPorts = {
    expose: async (port: number): Promise<string> => {
      const result = await this.http.post<{ url: string }>(`/v1/agents/${this.id}/ports`, {
        port,
      })
      return result.url
    },
  }

  async status(): Promise<AgentStatusInfo> {
    const info = await this.http.get<AgentStatusInfo>(`/v1/agents/${this.id}/status`)
    this._status = info.status
    return info
  }

  async pause(): Promise<Snapshot> {
    const snap = await this.http.post<Snapshot>(`/v1/agents/${this.id}/pause`)
    this._status = 'paused'
    return snap
  }

  async resume(opts?: ResumeOpts): Promise<void> {
    await this.http.post(`/v1/agents/${this.id}/resume`, opts)
    this._status = 'running'
  }

  async retry(): Promise<void> {
    await this.http.post(`/v1/agents/${this.id}/retry`)
    this._status = 'running'
  }

  async terminate(): Promise<void> {
    await this.http.post(`/v1/agents/${this.id}/terminate`)
    this._status = 'completed'
  }

  // ─── Long-Running Session Methods ────────────────────────────────

  async send(input: SendInputOpts): Promise<void> {
    await this.http.post(`/v1/agents/${this.id}/send`, input)
  }

  async progress(): Promise<AgentProgressData> {
    return this.http.get<AgentProgressData>(`/v1/agents/${this.id}/progress`)
  }

  async checkpoints(): Promise<CheckpointData[]> {
    const result = await this.http.get<{ data: CheckpointData[] }>(`/v1/agents/${this.id}/checkpoints`)
    return result.data
  }

  async checkpoint(opts?: CheckpointCreateOpts): Promise<CheckpointData> {
    return this.http.post<CheckpointData>(`/v1/agents/${this.id}/checkpoints`, opts ?? {})
  }

  get currentStatus(): string {
    return this._status
  }
}
