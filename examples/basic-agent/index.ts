/**
 * Theazo — Basic Agent Example
 *
 * Two ways to run an agent:
 *   1. session.run()            → one-liner: create agent, run, return result
 *   2. session.agents.create()  → explicit: create agent, then run separately
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  // Create a session for your end user — isolated compute, billing, limits
  const session = await theazo.sessions.forUser('user_123', {
    limits: { maxCost: { amount: 500, currency: 'usd', period: 'day' } },
  })
  console.log('Session:', session.id)

  // ── Option 1: One-liner (most common) ─────────────────────
  // Creates agent, runs task, returns result, cleans up

  const result = await session.run('researcher', 'analyze competitor pricing')
  console.log('Output:', result.output)
  console.log('Cost:', result.cost)       // { amount: 3, currency: 'usd' } (cents)
  console.log('Duration:', result.duration)

  // ── Option 2: Explicit (for long-running or reusable agents) ──
  // Create the agent, then run multiple tasks on it

  const agent = await session.agents.create({ compute: 'python' })
  console.log('Agent:', agent.id)

  const r1 = await agent.run('Calculate the first 20 prime numbers')
  console.log('Primes:', r1.output)

  const r2 = await agent.run('Now calculate the first 20 Fibonacci numbers')
  console.log('Fibonacci:', r2.output)
  // Same sandbox — files and state persist between runs
}

main().catch(console.error)
