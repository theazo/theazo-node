// ─── theazo/sandbox Types ──────────────────────────────────────────

export interface SandboxConfig {
  agentId: string
  sessionId: string
  endpoint: string
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface SandboxLogEntry {
  level: LogLevel
  message: string
  metadata?: Record<string, unknown>
  timestamp: string
}

export interface ModelTrackEvent {
  model: string
  inputTokens: number
  outputTokens: number
  cost?: { amount: number; currency: string }
}

export interface SpanEvent {
  name: string
  startTime: string
  endTime: string
  durationMs: number
  attributes?: Record<string, unknown>
}

export interface ProgressEvent {
  percentage: number
  message: string
}

export interface CompleteEvent {
  output: string
  artifacts?: string[]
}
