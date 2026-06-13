/**
 * Theazo — Infra-Only (Compute Only) Example
 *
 * Run your own agent code inside a Theazo sandbox.
 * Theazo provides the compute, isolation, and billing.
 * You bring the agent logic — LangGraph, CrewAI, or plain code.
 *
 * This is agent.exec(), not agent.run():
 *   - exec() = you send code, Theazo runs it in a sandbox
 *   - run()  = Theazo runs the full agent loop (model + tools)
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  const session = await theazo.sessions.forUser('infra_user', {
    limits: { maxCost: { amount: 1000, currency: 'usd', period: 'day' } },
  })

  // Create a sandbox — Python environment, isolated per user
  const agent = await session.agents.create({ compute: 'python' })
  console.log('Sandbox:', agent.id)

  // Run your own code in the sandbox
  const result = await agent.exec('python', `
import json
import math

# Your agent logic lives here — call any API, run any model
primes = [n for n in range(2, 100) if all(n % d != 0 for d in range(2, int(math.sqrt(n)) + 1))]

print(json.dumps({
    "primes": primes,
    "count": len(primes),
}))
  `)

  console.log('stdout:', result.stdout)
  console.log('exit code:', result.exitCode)

  // Run more code in the same sandbox — files persist between calls
  await agent.exec('python', `
with open('results.txt', 'w') as f:
    f.write('Analysis complete')
print('File written')
  `)

  // Read files from the sandbox
  const files = await agent.files.list('/')
  console.log('Files:', files.map(f => f.name))

  // Theazo tracked compute time, cost, and isolation — you wrote zero infra code
  console.log('Cost:', await session.usage())
}

main().catch(console.error)
