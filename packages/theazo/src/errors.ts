export type TheazoErrorCode =
  // Auth & Access
  | 'unauthorized'
  | 'forbidden'
  // Resources
  | 'not_found'
  | 'conflict'
  // Limits
  | 'rate_limited'
  | 'session_limit_exceeded'
  | 'fleet_cost_limit'
  // Providers
  | 'no_providers_available'
  | 'provider_error'
  // Validation
  | 'invalid_request'
  | 'workflow_circular_dependency'
  // Primitives
  | 'approval_expired'
  | 'schedule_overlap'
  | 'knowledge_quota_exceeded'
  | 'tool_handler_unreachable'
  | 'guardrail_blocked'
  // Client
  | 'connection_error'
  | 'timeout'

export class TheazoError extends Error {
  readonly code: TheazoErrorCode
  readonly status: number
  readonly details: Record<string, unknown>
  readonly requestId: string

  constructor(opts: {
    code: TheazoErrorCode
    message: string
    status: number
    details?: Record<string, unknown>
    requestId?: string
  }) {
    super(opts.message)
    this.name = 'TheazoError'
    this.code = opts.code
    this.status = opts.status
    this.details = opts.details ?? {}
    this.requestId = opts.requestId ?? ''
  }
}
