/**
 * Theazo — Approvals (Human-in-the-Loop) Example
 *
 * Pause an agent or workflow for human approval before sensitive actions.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo, workflow } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  // Create a workflow with an approval gate
  const pipeline = workflow('deploy-pipeline')
    .step('analyze', { agent: 'code-reviewer', input: { pr: '$.trigger.pr_url' } })
    .approval('approve-deploy', 'deploy', { timeout: '24h', defaultAction: 'deny' })
    .step('deploy', { agent: 'deployer', input: { review: '$.analyze.output' } })
    .build()

  const wf = await theazo.workflows.create(pipeline)

  // Run — pauses at the approval step
  const session = await theazo.sessions.forUser('deploy_user')
  const run = await theazo.workflows.run(wf.id, {
    userId: 'deploy_user',
    sessionId: session.id,
    input: { pr_url: 'https://github.com/acme/app/pull/42' },
  })
  console.log('Run:', run.id, '— status:', run.status)
  // → status: 'paused' (waiting for approval)

  // In production: approval comes from your UI, Slack bot, or dashboard
  // Here we approve programmatically
  const approvals = await theazo.approvals.list({ status: 'pending' })
  if (approvals.length > 0) {
    await theazo.approvals.approve(approvals[0].id)
    console.log('Approved — workflow continues to deploy step')
  }
}

main().catch(console.error)
