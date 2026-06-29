import { vi } from 'vitest'
import type { HttpClient } from '../src/http.js'

/**
 * Creates a mock HttpClient that records all calls.
 * Every method is a vi.fn() that can be configured with mockResolvedValue.
 */
export function createMockHttp() {
  const mock = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    stream: vi.fn(),
    streamPost: vi.fn(),
    request: vi.fn(),
  }

  // Default: resolve to undefined
  mock.get.mockResolvedValue(undefined)
  mock.post.mockResolvedValue(undefined)
  mock.put.mockResolvedValue(undefined)
  mock.patch.mockResolvedValue(undefined)
  mock.delete.mockResolvedValue(undefined)

  return mock as unknown as HttpClient & {
    get: ReturnType<typeof vi.fn>
    post: ReturnType<typeof vi.fn>
    put: ReturnType<typeof vi.fn>
    patch: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    stream: ReturnType<typeof vi.fn>
    streamPost: ReturnType<typeof vi.fn>
    request: ReturnType<typeof vi.fn>
  }
}

/** Minimal SessionData for constructing test Session objects */
export function makeSessionData(overrides?: Record<string, unknown>) {
  return {
    id: 'ses_test123',
    userId: 'user_test',
    status: 'active' as const,
    environment: 'development' as const,
    metadata: {},
    limits: {},
    createdAt: '2026-01-01T00:00:00Z',
    pausedAt: null,
    terminatedAt: null,
    ...overrides,
  }
}

/** Minimal AgentData for constructing test Agent objects */
export function makeAgentData(overrides?: Record<string, unknown>) {
  return {
    id: 'agt_test123',
    sessionId: 'ses_test123',
    userId: 'user_test',
    status: 'ready' as const,
    provider: 'theazo',
    compute: 'python' as const,
    model: 'claude-sonnet-4-20250514',
    browser: false,
    region: 'us-east-1',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}
