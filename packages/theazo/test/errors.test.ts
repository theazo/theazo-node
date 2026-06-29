import { describe, it, expect } from 'vitest'
import { TheazoError } from '../src/errors.js'

describe('TheazoError', () => {
  it('sets all properties from constructor', () => {
    const err = new TheazoError({
      code: 'unauthorized',
      message: 'Invalid API key',
      status: 401,
      details: { hint: 'Check your key' },
      requestId: 'req_abc',
    })

    expect(err.code).toBe('unauthorized')
    expect(err.message).toBe('Invalid API key')
    expect(err.status).toBe(401)
    expect(err.details).toEqual({ hint: 'Check your key' })
    expect(err.requestId).toBe('req_abc')
  })

  it('extends Error', () => {
    const err = new TheazoError({
      code: 'not_found',
      message: 'Session not found',
      status: 404,
    })

    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(TheazoError)
  })

  it('sets name to TheazoError', () => {
    const err = new TheazoError({
      code: 'timeout',
      message: 'Timed out',
      status: 0,
    })

    expect(err.name).toBe('TheazoError')
  })

  it('defaults details to empty object', () => {
    const err = new TheazoError({
      code: 'rate_limited',
      message: 'Slow down',
      status: 429,
    })

    expect(err.details).toEqual({})
  })

  it('defaults requestId to empty string', () => {
    const err = new TheazoError({
      code: 'connection_error',
      message: 'Connection failed',
      status: 0,
    })

    expect(err.requestId).toBe('')
  })

  it('has a stack trace', () => {
    const err = new TheazoError({
      code: 'forbidden',
      message: 'Access denied',
      status: 403,
    })

    expect(err.stack).toBeDefined()
    expect(err.stack).toContain('TheazoError')
  })

  it('works with all error codes', () => {
    const codes = [
      'unauthorized', 'forbidden', 'not_found', 'conflict',
      'rate_limited', 'session_limit_exceeded', 'fleet_cost_limit',
      'no_providers_available', 'provider_error',
      'invalid_request', 'workflow_circular_dependency',
      'approval_expired', 'schedule_overlap', 'knowledge_quota_exceeded',
      'tool_handler_unreachable', 'guardrail_blocked',
      'mcp_connect_failed', 'mcp_refresh_failed', 'mcp_server_unreachable',
      'mcp_name_conflict', 'approval_required', 'redis_required', 'redis_unavailable',
      'connection_error', 'timeout',
    ] as const

    for (const code of codes) {
      const err = new TheazoError({ code, message: `Error: ${code}`, status: 500 })
      expect(err.code).toBe(code)
    }
  })
})
