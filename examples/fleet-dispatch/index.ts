/**
 * Theazo — Fleet Dispatch Example
 *
 * Run the same agent across many inputs in parallel:
 *   - Dispatch with concurrency control
 *   - Poll for status
 *   - Stream results as they complete
 *   - Get paginated results
 *   - Cancel in-flight fleets
 *
 * Use cases: batch processing, competitor research, content generation,
 * data extraction, classification at scale.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  const session = await theazo.sessions.forUser('fleet_user')

  // ── Dispatch Fleet ──────────────────────────────────────────
  // Run 'researcher' agent on 5 inputs, max 3 concurrent

  const fleet = await session.fleets.dispatch({
    agent: 'researcher',
    inputs: [
      { company: 'Stripe' },
      { company: 'Vercel' },
      { company: 'Supabase' },
      { company: 'E2B' },
      { company: 'Anthropic' },
    ],
    concurrency: 3,
    timeout: '120s',
    maxCost: { amount: 500, currency: 'usd' },
    failurePolicy: 'continue', // keep going even if one item fails
  })

  console.log('Fleet:', fleet.id)
  console.log('Total items:', fleet.totalItems)
  console.log('Status:', fleet.currentStatus)

  // ── Option A: Poll for status ───────────────────────────────
  // Check progress periodically

  let status = await fleet.status()
  console.log('\nPolling:')
  while (status.status === 'running' || status.status === 'dispatching') {
    console.log(`  ${status.completed}/${status.total} done, ${status.running} running, cost: $${(status.cost.amount / 100).toFixed(2)}`)
    await new Promise(r => setTimeout(r, 3000))
    status = await fleet.status()
  }
  console.log(`Final: ${status.status} — ${status.completed} completed, ${status.failed} failed`)

  // ── Option B: Stream results as they complete ───────────────
  // (Alternative to polling — use one or the other)
  // for await (const item of fleet.stream()) {
  //   console.log(`Done: ${item.input.company} — $${(item.cost.amount / 100).toFixed(2)}`)
  // }

  // ── Get Results ─────────────────────────────────────────────
  // Paginated results with optional status filter

  const allResults = await fleet.results()
  console.log('\nAll results:')
  for (const item of allResults.data) {
    console.log(`  [${item.status}] ${item.input.company} — $${(item.cost.amount / 100).toFixed(2)} — ${item.duration}`)
    if (item.status === 'completed') {
      console.log(`    Output: ${item.output.substring(0, 100)}...`)
    }
  }

  // Filter by status
  const completedOnly = await fleet.results({ status: 'completed', limit: 3 })
  console.log(`\nCompleted items: ${completedOnly.data.length}`)

  // ── Cancel In-Flight Fleet ──────────────────────────────────
  // (Uncomment to test cancellation)
  // const fleet2 = await session.fleets.dispatch({
  //   agent: 'researcher',
  //   inputs: Array.from({ length: 20 }, (_, i) => ({ topic: `Topic ${i}` })),
  //   concurrency: 2,
  // })
  // await new Promise(r => setTimeout(r, 5000))
  // await fleet2.cancel()
  // console.log('Fleet cancelled:', fleet2.currentStatus)

  await session.terminate()
}

main().catch(console.error)
