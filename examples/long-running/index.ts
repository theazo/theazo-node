/**
 * Theazo — Long-Running Agents Example
 *
 * Agents that run for hours, days, or months:
 *   - Automatic checkpoints (save state periodically)
 *   - Hibernate when idle (save costs)
 *   - Resume from checkpoint (survive restarts)
 *   - Send input to a running agent
 *   - Monitor progress
 *
 * Use cases: CI monitors, literature trackers, security scanners,
 * data pipeline supervisors, always-on research agents.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  const session = await theazo.sessions.forUser('longrun_user')

  // ── Create a Long-Running Agent ─────────────────────────────
  // Configure checkpointing and hibernation

  const agent = await session.agents.create({
    compute: 'python',
    model: 'anthropic/claude-sonnet-4-20250514',
    instructions: `You are a CI/CD monitor. Watch for failing builds,
      analyze root causes, and create fix suggestions. Report progress regularly.`,
    lifecycle: {
      autoPause: { afterIdle: '10m' }, // hibernate after 10 min idle
      onFailure: 'retry',
      maxRetries: 3,
      retryDelay: '30s',
    },
  })

  console.log('Agent:', agent.id, '— status:', agent.currentStatus)

  // ── Run an Initial Task ─────────────────────────────────────

  const result = await agent.run('Scan the last 24 hours of CI builds and summarize failures')
  console.log('Initial scan:', result.output.substring(0, 200) + '...')

  // ── Create Manual Checkpoints ───────────────────────────────
  // Save state at meaningful milestones

  const ckpt1 = await agent.checkpoint({
    phase: 'initial-scan-complete',
    progress: 25,
    metadata: { buildsScanned: 147, failuresFound: 12 },
  })
  console.log('Checkpoint 1:', ckpt1.id, '— phase:', ckpt1.phase)

  // Continue working
  await agent.run('Deep-analyze the 3 most frequent failure patterns')

  const ckpt2 = await agent.checkpoint({
    phase: 'deep-analysis-complete',
    progress: 50,
    metadata: { patternsAnalyzed: 3 },
  })
  console.log('Checkpoint 2:', ckpt2.id, '— phase:', ckpt2.phase)

  // ── Check Progress ──────────────────────────────────────────

  const progress = await agent.progress()
  console.log('\nProgress:', {
    phase: progress.phase,
    checkpoints: progress.checkpoints,
    totalDuration: progress.totalDuration,
    activeDuration: progress.activeDuration,
    status: progress.status,
  })

  // ── List Checkpoints ────────────────────────────────────────

  const checkpoints = await agent.checkpoints()
  console.log('\nAll checkpoints:')
  for (const ckpt of checkpoints) {
    console.log(`  [${ckpt.id}] ${ckpt.phase} — progress: ${ckpt.progress}%`)
  }

  // ── Send Input to Running Agent ─────────────────────────────
  // Feed new data without restarting

  await agent.send({
    type: 'new_failure',
    content: 'Build #4521 just failed: TypeError in auth middleware',
    metadata: { buildId: '4521', branch: 'main' },
  })
  console.log('Sent new failure event to agent')

  // ── Pause and Resume ────────────────────────────────────────
  // Pause snapshots the entire sandbox. Resume restores it exactly.

  const snapshot = await agent.pause()
  console.log('\nPaused — snapshot:', snapshot.id, 'size:', snapshot.size)
  // Agent is now hibernated — zero compute cost

  // Resume later (could be minutes, hours, or days later)
  await agent.resume()
  console.log('Resumed from snapshot — status:', agent.currentStatus)

  // ── Resume from a Specific Checkpoint ───────────────────────
  // Roll back to a known-good state

  await agent.pause()
  await agent.resume({ checkpoint: ckpt1.id })
  console.log('Resumed from checkpoint:', ckpt1.id)
  // Agent is back at "initial-scan-complete" state

  // ── Resume on Different Infrastructure ──────────────────────
  // Move between providers or regions seamlessly

  await agent.pause()
  await agent.resume({
    provider: 'e2b',
    region: 'eu-west-1',
  })
  console.log('Resumed on E2B in eu-west-1')

  // ── Monitor Status ──────────────────────────────────────────

  const status = await agent.status()
  console.log('\nFinal status:', {
    status: status.status,
    duration: status.duration,
    cost: status.cost,
    provider: status.provider,
    region: status.region,
  })

  // Clean up
  await agent.terminate()
  await session.terminate()
}

main().catch(console.error)
