/**
 * Theazo — Basic Agent Example
 *
 * Create a session, spin up a Python sandbox, run a task with Claude, get the result.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({
  apiKey: process.env.THEAZO_API_KEY!,
})

async function main() {
  // 1. Create a session for a user
  const session = await theazo.sessions.forUser('example_user_1', {
    limits: { maxCost: { amount: 500, currency: 'usd', period: 'day' } },
  })
  console.log('Session:', session.id)

  // 2. Create an agent with Python compute
  const agent = await session.agents.create({ compute: 'python' })
  console.log('Agent:', agent.id)

  // 3. Run a task
  const result = await agent.run('Calculate the first 20 prime numbers using Python')
  console.log('Output:', result.output)
  console.log('Cost:', result.cost)
  console.log('Duration:', result.duration)
}

main().catch(console.error)
