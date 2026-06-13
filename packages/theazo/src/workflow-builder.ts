// ─── Typed Workflow Builder ─────────────────────────────────────────
// Fluent API that compiles to normalized workflow config JSON.
// workflow('name').step(...).condition(...).step(...).build()

import type { WorkflowStep, WorkflowCreateOpts, WorkflowPolicy, RetryConfig } from './types.js'

export class WorkflowBuilder {
  private name: string
  private description?: string
  private steps: WorkflowStep[] = []
  private inputSchema?: Record<string, unknown>
  private outputSchema?: Record<string, unknown>
  private policy?: WorkflowPolicy
  private onFailure?: 'pause' | 'retry' | 'skip' | 'abort'
  private retries?: RetryConfig
  private timeout?: string

  constructor(name: string) {
    this.name = name
  }

  describe(desc: string): this {
    this.description = desc
    return this
  }

  input(schema: Record<string, unknown>): this {
    this.inputSchema = schema
    return this
  }

  output(schema: Record<string, unknown>): this {
    this.outputSchema = schema
    return this
  }

  withPolicy(policy: WorkflowPolicy): this {
    this.policy = policy
    return this
  }

  withRetries(config: RetryConfig): this {
    this.retries = config
    return this
  }

  withTimeout(timeout: string): this {
    this.timeout = timeout
    return this
  }

  withFailurePolicy(policy: 'pause' | 'retry' | 'skip' | 'abort'): this {
    this.onFailure = policy
    return this
  }

  step(id: string, opts: {
    agent: string
    input?: Record<string, string>
    dependsOn?: string[]
    timeout?: string
    stateWrites?: string[]
    stateReads?: string[]
  }): this {
    this.steps.push({
      id,
      type: 'agent',
      agent: opts.agent,
      inputMap: opts.input,
      dependsOn: opts.dependsOn ?? (this.steps.length > 0 ? [this.steps[this.steps.length - 1].id] : undefined),
      timeout: opts.timeout,
      stateWrites: opts.stateWrites,
      stateReads: opts.stateReads,
    })
    return this
  }

  condition(id: string, opts: {
    if: string
    then?: string
    else?: string
    dependsOn?: string[]
  }): this {
    this.steps.push({
      id,
      type: 'condition',
      if: opts.if,
      then: opts.then ?? '',
      else: opts.else,
      dependsOn: opts.dependsOn ?? (this.steps.length > 0 ? [this.steps[this.steps.length - 1].id] : undefined),
    })
    return this
  }

  parallel(id: string, branches: WorkflowStep[], opts?: { dependsOn?: string[] }): this {
    this.steps.push({
      id,
      type: 'parallel',
      branches,
      dependsOn: opts?.dependsOn ?? (this.steps.length > 0 ? [this.steps[this.steps.length - 1].id] : undefined),
    })
    return this
  }

  transform(id: string, expression: Record<string, string>, opts?: { dependsOn?: string[] }): this {
    this.steps.push({
      id,
      type: 'transform',
      expression,
      dependsOn: opts?.dependsOn ?? (this.steps.length > 0 ? [this.steps[this.steps.length - 1].id] : undefined),
    })
    return this
  }

  map(id: string, opts: {
    over: string
    agent: string
    concurrency?: number
    onItemFailure?: 'skip' | 'abort' | 'retry'
    dependsOn?: string[]
  }): this {
    this.steps.push({
      id,
      type: 'map',
      over: opts.over,
      step: { id: `${id}_item`, type: 'agent', agent: opts.agent },
      concurrency: opts.concurrency,
      onItemFailure: opts.onItemFailure,
      dependsOn: opts.dependsOn ?? (this.steps.length > 0 ? [this.steps[this.steps.length - 1].id] : undefined),
    })
    return this
  }

  planner(id: string, opts: {
    agent: string
    description?: string
    maxSteps?: number
    allowedStepTypes?: string[]
    dependsOn?: string[]
  }): this {
    this.steps.push({
      id,
      type: 'planner',
      agent: opts.agent,
      description: opts.description,
      maxSteps: opts.maxSteps,
      allowedStepTypes: opts.allowedStepTypes,
      dependsOn: opts.dependsOn ?? (this.steps.length > 0 ? [this.steps[this.steps.length - 1].id] : undefined),
    })
    return this
  }

  delay(id: string, duration: string, opts?: { dependsOn?: string[] }): this {
    this.steps.push({
      id,
      type: 'delay',
      duration,
      dependsOn: opts?.dependsOn ?? (this.steps.length > 0 ? [this.steps[this.steps.length - 1].id] : undefined),
    })
    return this
  }

  approval(id: string, action: string, opts?: { timeout?: string; defaultAction?: 'approve' | 'deny'; dependsOn?: string[] }): this {
    this.steps.push({
      id,
      type: 'approval',
      action,
      timeout: opts?.timeout,
      defaultAction: opts?.defaultAction,
      dependsOn: opts?.dependsOn ?? (this.steps.length > 0 ? [this.steps[this.steps.length - 1].id] : undefined),
    })
    return this
  }

  webhook(id: string, url: string, opts?: { method?: 'GET' | 'POST'; headers?: Record<string, string>; body?: Record<string, unknown>; dependsOn?: string[] }): this {
    this.steps.push({
      id,
      type: 'webhook',
      url,
      method: opts?.method,
      headers: opts?.headers,
      body: opts?.body,
      dependsOn: opts?.dependsOn ?? (this.steps.length > 0 ? [this.steps[this.steps.length - 1].id] : undefined),
    })
    return this
  }

  build(): WorkflowCreateOpts {
    return {
      name: this.name,
      description: this.description,
      steps: this.steps,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      policy: this.policy,
      onFailure: this.onFailure,
      retries: this.retries,
      timeout: this.timeout,
    }
  }
}

export function workflow(name: string): WorkflowBuilder {
  return new WorkflowBuilder(name)
}
