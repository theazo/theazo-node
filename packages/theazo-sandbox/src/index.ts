// ─── theazo/sandbox ────────────────────────────────────────────────
// Lightweight ~5KB client for inside agent sandboxes.
// Bridges observability gap for customers using agent.exec().
// Reads THEAZO_AGENT_ID, THEAZO_SESSION_ID, THEAZO_ENDPOINT from env vars.

import type {
  SandboxConfig,
  LogLevel,
  ModelTrackEvent,
  CompleteEvent,
} from './types.js'

export type { SandboxConfig, LogLevel, ModelTrackEvent, CompleteEvent } from './types.js'

function getConfig(): SandboxConfig {
  const agentId = process.env.THEAZO_AGENT_ID
  const sessionId = process.env.THEAZO_SESSION_ID
  const endpoint = process.env.THEAZO_ENDPOINT

  if (!agentId || !sessionId || !endpoint) {
    throw new Error(
      'Missing Theazo sandbox env vars. Expected: THEAZO_AGENT_ID, THEAZO_SESSION_ID, THEAZO_ENDPOINT'
    )
  }

  return { agentId, sessionId, endpoint }
}

async function post(path: string, body: Record<string, unknown>): Promise<void> {
  const config = getConfig()
  try {
    await fetch(`${config.endpoint}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: config.agentId,
        sessionId: config.sessionId,
        ...body,
      }),
    })
  } catch {
    // Fire-and-forget: sandbox observability should never crash the agent
  }
}

// ─── Log ───────────────────────────────────────────────────────────

function emitLog(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
  void post('/v1/sandbox/log', {
    level,
    message,
    metadata,
    timestamp: new Date().toISOString(),
  })
}

export const log = {
  debug: (message: string, metadata?: Record<string, unknown>) => emitLog('debug', message, metadata),
  info: (message: string, metadata?: Record<string, unknown>) => emitLog('info', message, metadata),
  warn: (message: string, metadata?: Record<string, unknown>) => emitLog('warn', message, metadata),
  error: (message: string, metadata?: Record<string, unknown>) => emitLog('error', message, metadata),
}

// ─── Model Tracking ───────────────────────────────────────────────

export const model = {
  track: (event: ModelTrackEvent): void => {
    void post('/v1/sandbox/model', {
      model: event.model,
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      cost: event.cost,
      timestamp: new Date().toISOString(),
    })
  },
}

// ─── Trace Spans ──────────────────────────────────────────────────

export async function span<T>(name: string, fn: () => Promise<T>, attributes?: Record<string, unknown>): Promise<T> {
  const startTime = new Date()
  try {
    const result = await fn()
    const endTime = new Date()
    void post('/v1/sandbox/span', {
      name,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      status: 'completed',
      attributes,
    })
    return result
  } catch (err) {
    const endTime = new Date()
    void post('/v1/sandbox/span', {
      name,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
      attributes,
    })
    throw err
  }
}

// ─── Progress ─────────────────────────────────────────────────────

export function progress(percentage: number, message: string): void {
  void post('/v1/sandbox/progress', {
    percentage,
    message,
    timestamp: new Date().toISOString(),
  })
}

// ─── Completion Signal ────────────────────────────────────────────

export function complete(event: CompleteEvent): void {
  void post('/v1/sandbox/complete', {
    output: event.output,
    artifacts: event.artifacts ?? [],
    timestamp: new Date().toISOString(),
  })
}

// ─── Default Export ───────────────────────────────────────────────

export const theazo = {
  log,
  model,
  span,
  progress,
  complete,
}
