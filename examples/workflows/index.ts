/**
 * Theazo — Workflows Example
 *
 * Create a multi-step pipeline and watch it execute.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo, workflow } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  // Define a 3-step research pipeline using the typed builder
  const pipeline = workflow('research-pipeline')
    .step('research', { agent: 'researcher', input: { topic: '$.trigger.topic' } })
    .step('analyze', { agent: 'analyst', input: { data: '$.research.output' } })
    .step('write', { agent: 'writer', input: { analysis: '$.analyze.output' } })
    .build()

  const wf = await theazo.workflows.create(pipeline)
  console.log('Workflow:', wf.id)

  // Run and stream progress
  const stream = theazo.workflows.streamRun(wf.id, {
    input: { topic: 'AI agent infrastructure market' },
  })

  for await (const event of stream) {
    if (event.event === 'step.completed') {
      console.log(`Step "${event.stepId}" done — $${(event.cost / 100).toFixed(2)}`)
    }
    if (event.event === 'run.completed') {
      console.log('Output:', event.output)
    }
  }
}

main().catch(console.error)
