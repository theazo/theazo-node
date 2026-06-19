// ─── Monetary & Time Types ──────────────────────────────────────────

export interface Cost {
  amount: number // Integer cents (47 = $0.47)
  currency: string // 'usd'
}

export interface CostLimit {
  amount: number // Integer cents
  currency: string
  period: 'day' | 'month'
}

export interface Duration {
  hours?: number
  minutes?: number
  seconds?: number
}

// ─── Pagination ─────────────────────────────────────────────────────

export interface PaginatedList<T> {
  data: T[]
  hasMore: boolean
  cursor: string
}

export interface PaginationParams {
  limit?: number
  cursor?: string
}

// ─── Sessions ───────────────────────────────────────────────────────

export interface SessionLimits {
  maxCost?: CostLimit
  maxAgents?: number
  maxComputeMinutes?: number
  maxDuration?: Duration
}

export type SessionEnvironment = 'production' | 'staging' | 'development'

export interface SessionCreateOpts {
  userId: string
  environment?: SessionEnvironment
  limits?: SessionLimits
  metadata?: Record<string, string>
}

export interface SessionListFilters extends PaginationParams {
  status?: 'active' | 'paused' | 'terminated'
  createdAfter?: string
}

export interface SessionData {
  id: string // 'ses_a1b2c3'
  userId: string
  status: 'active' | 'paused' | 'terminated'
  environment: SessionEnvironment
  metadata: Record<string, string>
  limits: SessionLimits
  createdAt: string // ISO 8601
  pausedAt: string | null
  terminatedAt: string | null
}

export interface LimitStatus {
  limit: number
  used: number
  remaining: number
  percentage: number
}

export interface LimitsStatus {
  maxCost?: LimitStatus & { currency: string }
  maxAgents?: LimitStatus
  maxComputeMinutes?: LimitStatus
}

export interface UsageReport {
  cost: Cost
  computeMinutes: number
  activeAgents: number
  totalAgentsCreated: number
}

// ─── Agents ─────────────────────────────────────────────────────────

export type AgentStatus = 'booting' | 'ready' | 'running' | 'paused' | 'completed' | 'failed'
export type ComputeRuntime = 'python' | 'node' | 'go'
export type ContentFilterLevel = 'off' | 'light' | 'moderate' | 'strict'

export interface ApprovalConfig {
  require: string[]
  notifyVia: 'webhook'
  timeout: string
  defaultAction: 'approve' | 'deny'
}

export interface GuardrailConfig {
  contentFilter?: ContentFilterLevel
  blockPII?: boolean
  promptInjection?: boolean
  allowedDomains?: string[] | null
  blockedDomains?: string[]
  maxOutputTokens?: number
  maxToolCalls?: number
}

export interface LifecycleConfig {
  autoPause?: { afterIdle: string }
  onFailure?: 'retry' | 'pause' | 'terminate'
  maxRetries?: number
  retryDelay?: string
}

export interface MetadataExtraction {
  extract?: string[]
  custom?: Record<string, string>
}

export interface AgentCreateOpts {
  compute?: ComputeRuntime
  browser?: boolean
  storage?: string
  gpu?: string
  /** Model ID string ('anthropic/claude-sonnet') or per-agent BYOI config. */
  model?: string | AgentModelConfig
  instructions?: string
  tools?: string[]
  timeout?: string
  costCap?: Cost
  provider?: string
  providerFallback?: string
  region?: string
  approvals?: ApprovalConfig
  knowledge?: boolean | string
  metadata?: MetadataExtraction
  guardrails?: GuardrailConfig
  lifecycle?: LifecycleConfig
  definition?: string
  overrides?: Partial<AgentCreateOpts>
  secrets?: string[]
}

export interface AgentRunOpts {
  browser?: boolean
  timeout?: Duration
}

export interface AgentData {
  id: string // 'agt_x7y8z9'
  sessionId: string
  userId: string
  status: AgentStatus
  provider: string
  compute: ComputeRuntime
  model: string
  browser: boolean
  region: string
  createdAt: string
}

export interface AgentStatusInfo {
  status: AgentStatus
  duration: string
  cost: Cost
  task: string
  provider: string
  region: string
}

export interface AgentListFilters extends PaginationParams {
  status?: AgentStatus
  provider?: string
  compute?: ComputeRuntime
  sessionId?: string
}

// ─── Run Results ────────────────────────────────────────────────────

export interface ToolCall {
  tool: string
  input: Record<string, unknown>
  output: string
}

export interface RunOpts {
  maxCost?: Cost // Per-run cost cap — kills the run if exceeded
}

export interface RunResult {
  output: string
  artifacts: string[]
  cost: Cost
  duration: string // Human-readable '3m 12s'
  durationMs: number
  provider: string
  toolCalls: ToolCall[] | null
}

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

// ─── Streaming ──────────────────────────────────────────────────────

export type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; tool: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; output: string }
  | { type: 'progress'; message: string; percentage?: number }
  | { type: 'done'; output: string; cost: Cost; duration: string; durationMs: number; artifacts: string[] }

// ─── Snapshots ──────────────────────────────────────────────────────

export interface Snapshot {
  id: string // 'snap_abc'
  size: string
  provider: string
}

export interface ResumeOpts {
  provider?: string
  region?: string
  checkpoint?: string
}

// ─── Long-Running Sessions ──────────────────────────────────────────

export interface LongRunningOpts {
  longRunning?: boolean
  checkpointInterval?: string      // e.g. '30m'
  maxDuration?: string             // e.g. '7d'
  hibernateAfterIdle?: string      // e.g. '10m'
  autoResume?: boolean             // Default true
}

export interface CheckpointData {
  id: string                        // 'ckpt_a1b2c3'
  agentId: string
  snapshotId: string
  phase: string | null
  progress: number
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AgentProgressData {
  phase: string | null
  checkpoints: number
  totalDuration: string
  activeDuration: string
  status: 'active' | 'hibernated' | 'terminated'
  lastCheckpointAt: string | null
}

export interface SendInputOpts {
  type: string
  content: string
  metadata?: Record<string, unknown>
}

export interface CheckpointCreateOpts {
  phase?: string
  progress?: number
  metadata?: Record<string, unknown>
}

// ─── Files ──────────────────────────────────────────────────────────

export interface FileEntry {
  name: string
  size: number
  modified: string
}

export interface FileUploadOpts {
  userId: string
  file: Buffer | Uint8Array
  filename: string
  purpose: 'agent_input' | 'agent_output' | 'knowledge'
  autoIngest?: boolean    // If true and purpose === 'knowledge', auto-chunk + embed
  collection?: string     // Knowledge collection to ingest into
}

export interface FileData {
  id: string
  filename: string
  mimeType: string | null
  size: number
  purpose: 'agent_input' | 'agent_output' | 'knowledge'
  userId: string
  agentId: string | null
  sessionId: string | null
  createdAt: string
}

export interface FileListFilters {
  userId?: string
  purpose?: string
  agentId?: string
  sessionId?: string
}

// ─── Agent Definitions ──────────────────────────────────────────────

export interface AgentDefinitionOpts {
  name: string
  description: string
  compute: ComputeRuntime
  model: string
  instructions: string
  tools?: string[]
  browser?: boolean
  timeout?: string
  config?: { temperature?: number; maxTokens?: number }
}

export interface AgentDefinition {
  id: string // 'adef_abc'
  name: string
  version: number
  description: string
  compute: ComputeRuntime
  model: string
  instructions: string
  tools: string[]
  browser: boolean
  timeout: string
  config: { temperature?: number; maxTokens?: number }
  createdAt: string
}

export interface AgentDefinitionUpdate {
  instructions?: string
  tools?: string[]
  model?: string
  config?: { temperature?: number; maxTokens?: number }
  changelog?: string
}

export interface AgentDefinitionVersion {
  version: number
  createdAt: string
  changelog: string
}

// ─── Workflows ──────────────────────────────────────────────────────

export interface WorkflowStepBase {
  id: string
  type: string
  dependsOn?: string[]
  onStepFailure?: { action: 'goto'; target: string } | { action: 'retry' | 'skip' | 'pause' | 'abort' }
  outputSchema?: Record<string, unknown>
  onValidationFailure?: 'retry' | 'fail' | 'warn' | 'coerce'
}

export interface WorkflowAgentStep extends WorkflowStepBase {
  type: 'agent'
  agent: string
  inputMap?: Record<string, string>
  trigger?: string
  timeout?: string
  env?: Record<string, string | { secretRef: string }>
  stateWrites?: string[]
  stateReads?: string[]
}

export interface WorkflowParallelStep extends WorkflowStepBase {
  type: 'parallel'
  branches: WorkflowStep[]
}

export interface WorkflowConditionStep extends WorkflowStepBase {
  type: 'condition'
  if: string
  then: string | { agent?: string; delay?: string }
  else?: string | { agent?: string; delay?: string }
}

export interface WorkflowDelayStep extends WorkflowStepBase {
  type: 'delay'
  duration: string
}

export interface WorkflowApprovalStep extends WorkflowStepBase {
  type: 'approval'
  action: string
  params?: Record<string, unknown>
  timeout?: string
  defaultAction?: 'approve' | 'deny'
}

export interface WorkflowWebhookStep extends WorkflowStepBase {
  type: 'webhook'
  url: string
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: Record<string, unknown>
  auth?: { type: 'bearer'; secretRef: string }
  timeout?: string
}

export interface WorkflowTransformStep extends WorkflowStepBase {
  type: 'transform'
  expression: Record<string, string>
}

export interface WorkflowMapStep extends WorkflowStepBase {
  type: 'map'
  over: string
  step: WorkflowAgentStep
  concurrency?: number
  onItemFailure?: 'skip' | 'abort' | 'retry'
}

export interface WorkflowPlannerStep extends WorkflowStepBase {
  type: 'planner'
  agent: string
  description?: string
  maxSteps?: number
  allowedStepTypes?: string[]
  requireApproval?: boolean
  maxSpawnedCost?: Cost
}

export type WorkflowStep =
  | WorkflowAgentStep
  | WorkflowParallelStep
  | WorkflowConditionStep
  | WorkflowDelayStep
  | WorkflowApprovalStep
  | WorkflowWebhookStep
  | WorkflowTransformStep
  | WorkflowMapStep
  | WorkflowPlannerStep

export interface WorkflowPolicy {
  allowTools?: string[]
  denyTools?: string[]
  requireApprovalFor?: string[]
  maxCostPerStep?: Cost
  maxTotalCost?: Cost
  maxStepsTotal?: number
  maxParallel?: number
}

export interface RetryConfig {
  maxAttempts: number
  delay: string
  backoff?: 'fixed' | 'exponential'
}

export interface WorkflowCreateOpts {
  name: string
  description?: string
  steps: WorkflowStep[]
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  policy?: WorkflowPolicy
  onFailure?: 'pause' | 'retry' | 'skip' | 'abort'
  retries?: RetryConfig
  timeout?: string
}

export interface Workflow {
  id: string
  name: string
  description?: string
  version: number
  steps: WorkflowStep[]
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  policy?: WorkflowPolicy
  onFailure: string
  retries?: RetryConfig
  timeout?: string
  createdAt: string
  updatedAt: string
}

export interface WorkflowRunStepResult {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  output?: unknown
  cost: number
  duration?: number
  agentId?: string
  error?: string
}

export interface WorkflowRun {
  id: string
  workflowId: string
  workflowVersion?: number
  status: 'pending' | 'running' | 'completed' | 'partial' | 'failed' | 'paused' | 'cancelled'
  currentStepId?: string
  stepResults: Record<string, WorkflowRunStepResult>
  sharedState: Record<string, unknown>
  totalCost: Cost
  canRetryFrom?: string
  idempotencyKey?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export interface WorkflowRunOpts {
  userId: string
  sessionId: string
  input?: Record<string, unknown>
  idempotencyKey?: string
}

export interface WorkflowRunFilters extends PaginationParams {
  workflowId?: string
  status?: string
}

export interface WorkflowScheduleOpts {
  cron: string
  userId: string
  input?: Record<string, unknown>
  timezone?: string
}

export interface WorkflowEstimate {
  estimated: { min: number; max: number; currency: string }
  confidence: 'low' | 'medium' | 'high'
  breakdown: { stepId: string; type: string; estimated: { min: number; max: number } }[]
  basedOn: number
}

export interface WorkflowStreamEvent {
  event: string
  runId?: string
  stepId?: string
  [key: string]: unknown
}

// ─── Fleets ─────────────────────────────────────────────────────────

export interface FleetDispatchOpts {
  agent: string
  inputs: Record<string, unknown>[]
  concurrency?: number
  timeout?: string
  maxCost?: Cost
  failurePolicy?: 'continue' | 'abort' | 'pause'
}

export interface Fleet {
  id: string // 'flt_abc'
  status: 'dispatching' | 'running' | 'completed' | 'cancelled' | 'cost_limited'
  totalItems: number
}

export interface FleetStatus {
  status: string
  total: number
  completed: number
  failed: number
  running: number
  pending: number
  cost: Cost
}

export interface FleetItemResult {
  itemIndex: number
  input: Record<string, unknown>
  output: string
  cost: Cost
  duration: string
  status: 'completed' | 'failed' | 'pending' | 'running'
}

export interface FleetResultsFilters extends PaginationParams {
  status?: string
}

// ─── Teams ──────────────────────────────────────────────────────────

export interface TeamAgentConfig {
  role: string
  agent: string
  instructions: string
}

export type CoordinationMode = 'sequential' | 'collaborative' | 'hierarchical'

export interface TeamCreateOpts {
  name: string
  agents: TeamAgentConfig[]
  coordination: CoordinationMode
  sharedContext?: boolean
  maxRounds?: number
}

export interface Team {
  id: string // 'team_abc'
  name: string
  agents: TeamAgentConfig[]
  coordination: CoordinationMode
}

export interface TeamResult {
  output: string
  agentOutputs: Record<string, string>
  cost: Cost
  duration: string
}

// ─── Approvals ──────────────────────────────────────────────────────

export interface Approval {
  id: string // 'apr_1'
  agentId: string
  action: string
  params: Record<string, unknown>
  status: 'pending' | 'approved' | 'denied' | 'expired'
  requestedAt: string
  expiresAt: string
  resolvedAt?: string
  resolvedBy?: string
}

export interface ApprovalListFilters {
  sessionId?: string
  status?: 'pending' | 'approved' | 'denied' | 'expired'
}

export interface ApproveOpts {
  modifications?: Record<string, unknown>
}

export interface DenyOpts {
  reason?: string
}

// ─── Knowledge ──────────────────────────────────────────────────────

export interface KnowledgeUploadFile {
  filename: string
  content: Buffer | Uint8Array
  mimeType?: string
}

export interface KnowledgeUploadOpts {
  files: KnowledgeUploadFile[]
  collection?: string
}

export interface KnowledgeSyncOpts {
  source: {
    type: 'notion' | 'google_drive' | 'confluence' | 'github' | 'url'
    config: Record<string, unknown>
  }
  collection?: string
  schedule?: string
}

export interface KnowledgeQueryOpts {
  collection?: string
  topK?: number
}

export interface KnowledgeResult {
  content: string
  score: number
  source: string
  chunk: number
}

export interface KnowledgeStats {
  collections: number
  totalChunks: number
  totalTokens: number
  storageGB: number
}

export interface KnowledgeSourceData {
  id: string
  source: 'upload' | 'notion' | 'google_drive' | 'confluence' | 'github' | 'url'
  status: 'active' | 'syncing' | 'error'
  collection?: string
  syncSchedule?: string
  chunkCount: number
  createdAt: string
}

// ─── Schedules & Triggers ───────────────────────────────────────────

export interface ScheduleCreateOpts {
  name: string
  agent: string
  userId: string
  cron: string
  timezone?: string
  input?: Record<string, unknown>
}

export interface Schedule {
  id: string // 'sch_abc'
  name: string
  agent: string
  userId: string
  cron: string
  timezone: string
  status: 'active' | 'paused'
  createdAt: string
}

export interface ScheduleExecution {
  executionId: string
  agentId: string
  status: string
  cost: Cost
  startedAt: string
  completedAt: string | null
}

export interface TriggerCreateOpts {
  name: string
  agent: string
  userId: string
  type: 'webhook'
}

export interface Trigger {
  id: string // 'trg_abc'
  name: string
  url: string
  secret: string
  agent: string
  userId: string
}

// ─── Tools ──────────────────────────────────────────────────────────

export interface ToolRegisterOpts {
  name: string
  description: string
  parameters: Record<string, unknown>
  handler: {
    type: 'webhook'
    url: string
  }
  requiresApproval?: boolean
}

export interface Tool {
  name: string
  description: string
  builtin: boolean
  parameters?: Record<string, unknown>
  handler?: { type: string; url: string }
  requiresApproval: boolean
}

export interface ToolResult {
  output: unknown
  success: boolean
}

// ─── Tasks ──────────────────────────────────────────────────────────

export interface TaskSubmitOpts {
  agent: string
  input: Record<string, unknown>
  webhook?: string
  priority?: 'low' | 'normal' | 'high'
}

export interface Task {
  taskId: string // 'task_abc'
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress?: number
  message?: string
  output?: string
  cost?: Cost
}

export interface TaskListFilters {
  status?: string
}

export interface TaskWaitOpts {
  timeout?: string
}

// ─── Secrets ────────────────────────────────────────────────────────

export interface SecretInfo {
  name: string
  createdAt: string
}

// ─── Logs ───────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogSource = 'agent' | 'system' | 'provider' | 'model'

export interface LogEntry {
  id: string // 'log_abc123'
  timestamp: string
  level: LogLevel
  source: LogSource
  agentId: string
  sessionId: string
  userId: string
  provider: string
  message: string
  metadata?: Record<string, unknown>
  traceId?: string
}

export interface LogQueryFilters {
  sessionId?: string
  agentId?: string
  level?: LogLevel
  search?: string
  since?: string
  until?: string
  limit?: number
}

export interface LogStreamFilters {
  sessionId?: string
  agentId?: string
  level?: LogLevel
}

// ─── Metrics & Traces ───────────────────────────────────────────────

export interface MetricsSummary {
  activeAgents: number
  activeSessions: number
  costToday: Cost
  agentsCreatedToday: number
  errorRate: number
}

export interface MetricQueryOpts {
  metric: string
  since: string
  until: string
  interval: string
  tags?: Record<string, string>
}

export interface MetricDataPoint {
  timestamp: string
  p50: number
  p95: number
  p99: number
}

export interface Trace {
  traceId: string
  agentId: string
  durationMs: number
  cost: Cost
}

export interface TraceDetail extends Trace {
  spans: TraceSpan[]
}

export interface TraceSpan {
  spanId: string
  name: string
  startTime: string
  endTime: string
  durationMs: number
  attributes: Record<string, unknown>
}

export interface TraceListFilters extends PaginationParams {
  agentId?: string
  sessionId?: string
}

// ─── Usage & Billing ────────────────────────────────────────────────

export interface UsageSummary {
  totalCost: Cost
  activeSessions: number
  runningAgents: number
  topUser: { userId: string; cost: Cost }
}

export interface UsageSummaryOpts {
  period: 'today' | 'week' | 'month'
}

export interface UserUsage {
  compute: { minutes: number; cost: Cost }
  models: { calls: number; tokens: { input: number; output: number }; cost: Cost }
  storage: { gbHours: number; cost: Cost }
  total: Cost
  breakdown: { date: string; total: Cost }[]
}

export interface UserUsageOpts {
  period: 'today' | 'week' | 'month'
}

export interface DailyUsage {
  date: string
  cost: Cost
  computeMinutes: number
  modelCalls: number
}

export interface DailyUsageOpts {
  period: 'last_7_days' | 'last_30_days'
}

export interface ProviderUsage {
  [provider: string]: Cost
}

export interface ProviderUsageOpts {
  period: 'today' | 'week' | 'month'
}

export interface UsageExportOpts {
  period: 'month'
  format: 'stripe' | 'csv' | 'json'
}

// ─── Billing ────────────────────────────────────────────────────────

export type BillingPlan = 'free' | 'pro' | 'enterprise'

export interface BillingSubscription {
  id: string
  plan: BillingPlan
  status: 'active' | 'trialing' | 'past_due' | 'cancelled'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

export interface BillingBudgetConfig {
  monthly: Cost
  alerts?: {
    threshold: number // 0.0 to 1.0
    channel?: 'webhook'
    action?: 'pause_all' | 'pause_user'
  }[]
}

export interface BillingBudgetStatus {
  budget: Cost
  spent: Cost
  remaining: Cost
  percentage: number
  alerts: { threshold: number; fired: boolean }[]
}

export interface BillingCheckoutOpts {
  plan: BillingPlan
  successUrl: string
  cancelUrl: string
}

// ─── Webhooks ───────────────────────────────────────────────────────

export interface WebhookCreateOpts {
  url: string
  events: string[]
}

export interface Webhook {
  id: string // 'wh_abc'
  url: string
  secret: string
  events: string[]
  createdAt: string
}

// ─── Guardrails ─────────────────────────────────────────────────────

export interface GuardrailViolation {
  id: string
  agentId: string
  type: string
  message: string
  timestamp: string
}

export interface GuardrailViolationFilters {
  period?: string
}

// ─── API Keys ───────────────────────────────────────────────────────

export interface ApiKeyCreateOpts {
  name: string
  environment: 'live' | 'test'
}

export interface ApiKey {
  id: string // 'key_abc'
  name: string
  prefix: string // 'th_live_a1b2...'
  environment: 'live' | 'test'
  createdAt: string
  lastUsedAt: string | null
}

export interface ApiKeyCreated extends ApiKey {
  key: string // Full key, shown once
}

// ─── Init Config ────────────────────────────────────────────────────

export interface ComputeProviderConfig {
  provider: string
  credentials: Record<string, string>
  priority?: number
  limits?: { maxConcurrent?: number }
}

export interface ModelProviderConfig {
  provider?: string
  credentials?: Record<string, string>
  baseUrl?: string
  credentialRef?: string
}

/** Per-agent model override. Allows mixing managed + BYOI models in the same session. */
export interface AgentModelConfig {
  /** Model provider for direct BYOI ('anthropic' | 'openai'). Omit for gateway BYOI. */
  provider?: string
  /** OpenAI-compatible gateway URL (OpenRouter, LiteLLM, Azure, vLLM, Ollama). */
  baseUrl?: string
  /** Reference to API key stored in secrets vault. */
  credentialRef?: string
  /** Model name/ID at the provider or gateway (e.g. 'gpt-4o', 'agentco/research-v3'). */
  name?: string
}

export interface TheazoConfig {
  apiKey: string
  baseUrl?: string
  compute?:
    | { provider: string; credentials: Record<string, string> }
    | { providers: ComputeProviderConfig[] }
  models?: ModelProviderConfig
}

// ─── Chat ──────────────────────────────────────────────────────────

export type ContextStrategy = 'full' | 'sliding_window' | 'summarize'

export interface ChatContextConfig {
  strategy?: ContextStrategy  // omit for raw pass-through (no context management)
  maxTokens?: number
  summarizeAfter?: number
}

export interface ChatCreateOpts {
  agent?: string
  title?: string
  metadata?: Record<string, unknown>
  context?: ChatContextConfig
  systemPrompt?: string
  knowledge?: string
}

export interface ChatSendOpts {
  content: string
  attachments?: string[]
  signal?: AbortSignal
}

export interface ChatMessageListOpts extends PaginationParams {
  order?: 'asc' | 'desc'
}

export interface ChatListOpts extends PaginationParams {
  status?: 'active' | 'archived' | 'all'
}

export interface ChatUpdateOpts {
  title?: string
  metadata?: Record<string, unknown>
}

export interface ChatThreadCreateOpts {
  parentMessageId: string
  title?: string
}

export interface ChatHandoffOpts {
  reason: string
  to: string // 'human' | 'agent:<definition_id>'
  metadata?: Record<string, unknown>
}

export interface ChatSearchOpts {
  query: string
  userId?: string
  conversationId?: string
  limit?: number
}

export type ChatConversationStatus = 'active' | 'archived' | 'handed_off'
export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface ChatConversation {
  id: string
  agentId: string | null
  title: string | null
  status: ChatConversationStatus
  messageCount: number
  totalCost: Cost
  lastMessageAt: string | null
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: ChatMessageRole
  content: string | null
  toolCalls: Array<{ name: string; input: Record<string, unknown>; output?: string }> | null
  attachments: string[]
  cost: Cost
  tokenCount: number | null
  createdAt: string
}

export interface ChatThread {
  id: string
  parentMessageId: string
  title: string | null
  messageCount: number
  createdAt: string
}

export type ChatHandoffStatus = 'pending' | 'accepted' | 'resolved' | 'cancelled'

export interface ChatHandoff {
  id: string
  conversationId: string
  reason: string
  toTarget: string
  status: ChatHandoffStatus
  requestedAt: string
  resolvedAt: string | null
}

export interface ChatContextState {
  totalMessages: number
  contextMessages: number
  contextTokens: number
  summary: string | null
  strategy: ContextStrategy
}

export interface ChatSearchResult {
  conversationId: string
  messageId: string
  content: string
  score: number
  createdAt: string
}

export type ChatStreamEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; name: string; output: string }
  | { type: 'done'; messageId: string; cost: Cost; tokenCount: number }

// ─── MCP ────────────────────────────────────────────────────────────

export type MCPTransport = 'sse' | 'streamable-http' | 'stdio'
export type MCPConnectionStatus = 'connected' | 'disconnected' | 'error' | 'configured'
export type MCPCredentialMode = 'platform' | 'per_user'

export interface MCPConnectOpts {
  name: string
  transport: MCPTransport
  url?: string
  headers?: Record<string, string>
  command?: string
  args?: string[]
  toolFilter?: string[] | null
  requiresApproval?: string[]
  credentialsType?: MCPCredentialMode
}

export interface MCPConnection {
  id: string                              // 'mcp_a1b2c3'
  name: string
  transport: MCPTransport
  url: string | null
  command: string | null
  args: string[] | null
  status: MCPConnectionStatus
  credentialsType: MCPCredentialMode
  toolFilter: string[] | null
  requiresApproval: string[]
  toolCount: number
  discoveredTools: MCPTool[]
  lastHealthCheck: string | null
  error: string | null
  createdAt: string
  updatedAt: string
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  serverId: string
  serverName: string
}

export interface MCPHealth {
  status: MCPConnectionStatus
  latencyMs: number
  lastPingAt: string
  error?: string
}

export interface MCPUpdateOpts {
  headers?: Record<string, string>
  toolFilter?: string[] | null
  requiresApproval?: string[]
}

export interface MCPUserCredentialsOpts {
  headers: Record<string, string>
}

export interface MCPServerConfig {
  expose: string[] | '*'
  auth: 'api_key'
}

export interface MCPServerConfigResponse extends MCPServerConfig {
  url: string
}

// ─── Channels ────────────────────────────────────────────────────────

export type ChannelType = 'chat_embed' | 'slack' | 'email' | 'phone'

export interface Channel {
  id: string
  agentDefinitionId: string
  type: ChannelType
  config: Record<string, unknown>
  enabled: boolean
  conversationCount: number
  createdAt: string
  updatedAt: string
  scriptTag?: string // Only for chat_embed
}

export interface ChatEmbedCreateOpts {
  agent: string
  theme: {
    primaryColor: string
    position?: 'bottom-right' | 'bottom-left'
    title: string
    placeholder?: string
  }
}

export interface SlackCreateOpts {
  agent: string
  workspace: string
  channels: string[]
  botName: string
}

export interface EmailCreateOpts {
  agent: string
  address: string
}

export interface PhoneCreateOpts {
  agent: string
  phoneNumber: string
  voice?: string
}

export interface ChannelUpdateOpts {
  config?: Record<string, unknown>
  enabled?: boolean
}

export interface ChannelConversation {
  id: string
  channelId: string
  userId: string
  agentId: string
  messageCount: number
  startedAt: string
  lastMessageAt: string
}
