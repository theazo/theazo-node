/**
 * Theazo — Workflows Example
 *
 * Multi-agent pipelines with 9 step types:
 *
 *   agent       → run an AI agent
 *   parallel    → run steps concurrently
 *   condition   → branch based on output
 *   transform   → reshape data (no compute cost)
 *   map         → iterate over an array (fan-out/fan-in)
 *   delay       → wait before continuing
 *   approval    → pause for human approval
 *   webhook     → call an external URL
 *   planner     → agent decides what steps to add (dynamic DAG)
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo, workflow } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  // ── Example 1: Sequential pipeline ────────────────────────
  // Research → Analyze → Write report

  const simple = workflow('research-report')
    .step('research', { agent: 'researcher', input: { topic: '$.trigger.topic' } })
    .step('analyze', { agent: 'analyst', input: { data: '$.research.output' } })
    .step('write', { agent: 'writer', input: { analysis: '$.analyze.output' } })
    .build()

  // ── Example 2: Parallel + condition ───────────────────────
  // Research two topics in parallel, then decide which path to take

  const branching = workflow('competitive-analysis')
    .step('research', { agent: 'researcher', input: { query: '$.trigger.query' } })
    .parallel('gather', [
      { id: 'pricing', type: 'agent', agent: 'pricing-analyst' },
      { id: 'features', type: 'agent', agent: 'feature-analyst' },
    ])
    .condition('quality-check', {
      if: '$.research.output.confidence > 0.8',
      then: 'publish',
      else: 'review',
    })
    .step('publish', { agent: 'publisher' })
    .step('review', { agent: 'reviewer' })
    .build()

  // ── Example 3: Map (iterate over array) ───────────────────
  // Process each item in a list — like fleet dispatch inside a workflow

  const batch = workflow('classify-tickets')
    .step('fetch', { agent: 'ticket-fetcher' })
    .map('classify-all', {
      over: '$.fetch.output.tickets',
      agent: 'classifier',
      concurrency: 5,
      onItemFailure: 'skip',
    })
    .transform('summarize', {
      total: '$.classify-all.output.length',
      results: '$.classify-all.output',
    })
    .build()

  // ── Example 4: With policy + input validation ─────────────
  // Restrict what the workflow can do

  const secure = workflow('secure-pipeline')
    .input({
      type: 'object',
      properties: { url: { type: 'string', format: 'uri' } },
      required: ['url'],
    })
    .withPolicy({
      allowTools: ['web_search', 'read_file'],
      maxCostPerStep: { amount: 100, currency: 'usd' },
      maxTotalCost: { amount: 500, currency: 'usd' },
    })
    .step('extract', { agent: 'extractor', input: { url: '$.trigger.url' } })
    .approval('review', 'human_review', { timeout: '24h' })
    .step('process', { agent: 'processor', input: { data: '$.extract.output' } })
    .build()

  // ── Run one and stream progress ───────────────────────────

  const wf = await theazo.workflows.create(simple)
  console.log('Workflow:', wf.id)

  const stream = theazo.workflows.streamRun(wf.id)

  for await (const event of stream) {
    switch (event.event) {
      case 'step.started':
        console.log(`▶ Step "${event.stepId}" started`)
        break
      case 'step.completed':
        console.log(`✓ Step "${event.stepId}" done — cost: ${event.cost}`)
        break
      case 'step.failed':
        console.log(`✗ Step "${event.stepId}" failed: ${event.error}`)
        break
      case 'run.completed':
        console.log(`\nDone — total cost: ${event.totalCost}`)
        console.log('Output:', event.output)
        break
    }
  }
}

main().catch(console.error)
