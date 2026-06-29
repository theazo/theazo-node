/**
 * Theazo — Fleet Dispatch Example
 *
 * Run the same agent across 10 inputs in parallel.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  const session = await theazo.sessions.forUser('fleet_user')

  // Dispatch 10 research tasks in parallel (max 3 at a time)
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
  })

  console.log('Fleet:', fleet.id, '— status:', fleet.currentStatus)

  // Stream results as they complete
  for await (const item of fleet.stream()) {
    console.log(`Done: ${item.input.company} — $${(item.cost.amount / 100).toFixed(2)}`)
  }
}

main().catch(console.error)
