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

  // Dispatch 10 research tasks in parallel
  const fleet = await session.fleet.dispatch({
    agent: 'researcher',
    inputs: [
      { company: 'Stripe' },
      { company: 'Vercel' },
      { company: 'Supabase' },
      { company: 'E2B' },
      { company: 'Anthropic' },
      { company: 'OpenAI' },
      { company: 'Modal' },
      { company: 'Fly.io' },
      { company: 'Replicate' },
      { company: 'Hugging Face' },
    ],
    concurrency: 3, // max 3 running at once
  })

  console.log('Fleet:', fleet.id)
  console.log('Total items:', fleet.totalItems)

  // Poll for completion
  const status = await fleet.status()
  console.log('Completed:', status.progress.completed)
  console.log('Total cost:', status.totalCost)
}

main().catch(console.error)
