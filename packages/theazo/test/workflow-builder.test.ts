import { describe, it, expect } from 'vitest'
import { workflow, WorkflowBuilder } from '../src/workflow-builder.js'

describe('workflow() factory', () => {
  it('returns a WorkflowBuilder', () => {
    expect(workflow('test')).toBeInstanceOf(WorkflowBuilder)
  })
})

describe('WorkflowBuilder', () => {
  describe('basic build', () => {
    it('produces a WorkflowCreateOpts with name and empty steps', () => {
      const result = workflow('empty-workflow').build()

      expect(result.name).toBe('empty-workflow')
      expect(result.steps).toEqual([])
    })

    it('sets description', () => {
      const result = workflow('test').describe('A test workflow').build()

      expect(result.description).toBe('A test workflow')
    })

    it('sets input schema', () => {
      const schema = { type: 'object', properties: { url: { type: 'string' } } }
      const result = workflow('test').input(schema).build()

      expect(result.inputSchema).toEqual(schema)
    })

    it('sets output schema', () => {
      const schema = { type: 'object', properties: { report: { type: 'string' } } }
      const result = workflow('test').output(schema).build()

      expect(result.outputSchema).toEqual(schema)
    })
  })

  describe('step()', () => {
    it('adds an agent step', () => {
      const result = workflow('test')
        .step('research', { agent: 'researcher' })
        .build()

      expect(result.steps).toHaveLength(1)
      expect(result.steps[0]).toMatchObject({
        id: 'research',
        type: 'agent',
        agent: 'researcher',
      })
    })

    it('auto-chains dependsOn to previous step', () => {
      const result = workflow('test')
        .step('step1', { agent: 'a1' })
        .step('step2', { agent: 'a2' })
        .step('step3', { agent: 'a3' })
        .build()

      expect(result.steps[0].dependsOn).toBeUndefined()
      expect(result.steps[1].dependsOn).toEqual(['step1'])
      expect(result.steps[2].dependsOn).toEqual(['step2'])
    })

    it('allows explicit dependsOn override', () => {
      const result = workflow('test')
        .step('step1', { agent: 'a1' })
        .step('step2', { agent: 'a2' })
        .step('step3', { agent: 'a3', dependsOn: ['step1'] })
        .build()

      expect(result.steps[2].dependsOn).toEqual(['step1'])
    })

    it('sets inputMap from input option', () => {
      const result = workflow('test')
        .step('analyze', { agent: 'analyst', input: { data: '$.research.output' } })
        .build()

      const step = result.steps[0] as { inputMap?: Record<string, string> }
      expect(step.inputMap).toEqual({ data: '$.research.output' })
    })
  })

  describe('condition()', () => {
    it('adds a condition step', () => {
      const result = workflow('test')
        .step('check', { agent: 'checker' })
        .condition('branch', {
          if: '$.check.output.confidence > 0.8',
          then: 'publish',
          else: 'review',
        })
        .build()

      expect(result.steps[1]).toMatchObject({
        id: 'branch',
        type: 'condition',
        if: '$.check.output.confidence > 0.8',
        then: 'publish',
        else: 'review',
      })
    })
  })

  describe('parallel()', () => {
    it('adds a parallel step with branches', () => {
      const result = workflow('test')
        .parallel('gather', [
          { id: 'pricing', type: 'agent', agent: 'pricing-analyst' },
          { id: 'features', type: 'agent', agent: 'feature-analyst' },
        ])
        .build()

      const step = result.steps[0] as { type: string; branches: unknown[] }
      expect(step.type).toBe('parallel')
      expect(step.branches).toHaveLength(2)
    })
  })

  describe('transform()', () => {
    it('adds a transform step with expression', () => {
      const result = workflow('test')
        .transform('reshape', { total: '$.data.length', items: '$.data' })
        .build()

      const step = result.steps[0] as { type: string; expression: Record<string, string> }
      expect(step.type).toBe('transform')
      expect(step.expression).toEqual({ total: '$.data.length', items: '$.data' })
    })
  })

  describe('map()', () => {
    it('adds a map step', () => {
      const result = workflow('test')
        .map('process-all', {
          over: '$.fetch.output.items',
          agent: 'processor',
          concurrency: 5,
          onItemFailure: 'skip',
        })
        .build()

      const step = result.steps[0] as {
        type: string
        over: string
        step: { id: string; type: string; agent: string }
        concurrency: number
        onItemFailure: string
      }
      expect(step.type).toBe('map')
      expect(step.over).toBe('$.fetch.output.items')
      expect(step.step.agent).toBe('processor')
      expect(step.step.id).toBe('process-all_item')
      expect(step.concurrency).toBe(5)
      expect(step.onItemFailure).toBe('skip')
    })
  })

  describe('planner()', () => {
    it('adds a planner step', () => {
      const result = workflow('test')
        .planner('plan', { agent: 'planner', maxSteps: 10 })
        .build()

      const step = result.steps[0] as { type: string; agent: string; maxSteps: number }
      expect(step.type).toBe('planner')
      expect(step.agent).toBe('planner')
      expect(step.maxSteps).toBe(10)
    })
  })

  describe('delay()', () => {
    it('adds a delay step', () => {
      const result = workflow('test')
        .delay('wait', '5m')
        .build()

      const step = result.steps[0] as { type: string; duration: string }
      expect(step.type).toBe('delay')
      expect(step.duration).toBe('5m')
    })
  })

  describe('approval()', () => {
    it('adds an approval step', () => {
      const result = workflow('test')
        .approval('review', 'publish_report', { timeout: '24h', defaultAction: 'deny' })
        .build()

      const step = result.steps[0] as {
        type: string
        action: string
        timeout: string
        defaultAction: string
      }
      expect(step.type).toBe('approval')
      expect(step.action).toBe('publish_report')
      expect(step.timeout).toBe('24h')
      expect(step.defaultAction).toBe('deny')
    })
  })

  describe('webhook()', () => {
    it('adds a webhook step', () => {
      const result = workflow('test')
        .webhook('notify', 'https://example.com/hook', {
          method: 'POST',
          headers: { 'X-Token': 'abc' },
          body: { status: 'done' },
        })
        .build()

      const step = result.steps[0] as {
        type: string
        url: string
        method: string
        headers: Record<string, string>
      }
      expect(step.type).toBe('webhook')
      expect(step.url).toBe('https://example.com/hook')
      expect(step.method).toBe('POST')
      expect(step.headers).toEqual({ 'X-Token': 'abc' })
    })
  })

  describe('policy and config', () => {
    it('sets policy', () => {
      const result = workflow('test')
        .withPolicy({
          allowTools: ['web_search'],
          maxTotalCost: { amount: 500, currency: 'usd' },
        })
        .build()

      expect(result.policy).toEqual({
        allowTools: ['web_search'],
        maxTotalCost: { amount: 500, currency: 'usd' },
      })
    })

    it('sets retries', () => {
      const result = workflow('test')
        .withRetries({ maxAttempts: 3, delay: '5s', backoff: 'exponential' })
        .build()

      expect(result.retries).toEqual({
        maxAttempts: 3,
        delay: '5s',
        backoff: 'exponential',
      })
    })

    it('sets timeout', () => {
      const result = workflow('test')
        .withTimeout('1h')
        .build()

      expect(result.timeout).toBe('1h')
    })

    it('sets failure policy', () => {
      const result = workflow('test')
        .withFailurePolicy('retry')
        .build()

      expect(result.onFailure).toBe('retry')
    })
  })

  describe('full pipeline', () => {
    it('builds a complete multi-step workflow', () => {
      const result = workflow('research-report')
        .describe('Research and generate a report')
        .input({ type: 'object', properties: { topic: { type: 'string' } } })
        .withPolicy({ maxTotalCost: { amount: 1000, currency: 'usd' } })
        .withTimeout('2h')
        .step('research', { agent: 'researcher', input: { topic: '$.trigger.topic' } })
        .step('analyze', { agent: 'analyst', input: { data: '$.research.output' } })
        .condition('quality-check', {
          if: '$.analyze.output.confidence > 0.8',
          then: 'publish',
          else: 'review',
        })
        .step('publish', { agent: 'publisher', dependsOn: ['quality-check'] })
        .step('review', { agent: 'reviewer', dependsOn: ['quality-check'] })
        .build()

      expect(result.name).toBe('research-report')
      expect(result.description).toBe('Research and generate a report')
      expect(result.steps).toHaveLength(5)
      expect(result.timeout).toBe('2h')
      expect(result.policy?.maxTotalCost?.amount).toBe(1000)
    })
  })
})
