/**
 * Theazo — Basic Agent Example
 *
 * Everything you can do with agents:
 *   - Create sessions with limits and metadata
 *   - Run agents (one-liner or explicit)
 *   - Execute raw code in sandboxes
 *   - Read/write files in the sandbox
 *   - Pause, resume, and manage agent lifecycle
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  // ── Session Setup ───────────────────────────────────────────
  // Every user gets an isolated session — compute, billing, limits

  const session = await theazo.sessions.forUser('user_123', {
    limits: {
      maxCost: { amount: 500, currency: 'usd', period: 'day' },
      maxAgents: 5,
      maxComputeMinutes: 60,
    },
    metadata: { plan: 'pro', source: 'api' },
  })
  console.log('Session:', session.id, '— status:', session.status)

  // Check limits and usage
  const limits = await session.limits()
  console.log('Limits:', limits)

  const usage = await session.usage()
  console.log('Usage:', usage)

  // ── Option 1: One-liner ─────────────────────────────────────
  // Creates agent, runs task, returns result — the most common pattern

  const result = await session.run('researcher', 'analyze competitor pricing')
  console.log('Output:', result.output)
  console.log('Cost:', result.cost)       // { amount: 3, currency: 'usd' } (cents)
  console.log('Duration:', result.duration)
  console.log('Tool calls:', result.toolCalls?.length ?? 0)

  // ── Option 2: Explicit Agent ────────────────────────────────
  // Create an agent, run multiple tasks, use the sandbox directly

  const agent = await session.agents.create({
    compute: 'python',
    model: 'anthropic/claude-sonnet-4-20250514',
    instructions: 'You are a helpful assistant. Be concise.',
    timeout: '120s',
  })
  console.log('Agent:', agent.id, '— status:', agent.currentStatus)

  // Run multiple tasks — state persists between them
  const r1 = await agent.run('Calculate the first 20 prime numbers')
  console.log('Primes:', r1.output)

  const r2 = await agent.run('Now calculate the first 20 Fibonacci numbers')
  console.log('Fibonacci:', r2.output)

  // ── Execute Raw Code ────────────────────────────────────────
  // Run arbitrary code in the sandbox — Python, Node, Go

  const execResult = await agent.exec('python', `
import json, sys, math

primes = [n for n in range(2, 50) if all(n % d for d in range(2, int(math.sqrt(n)) + 1))]
print(json.dumps({"primes": primes, "platform": sys.platform}))
  `)
  console.log('Exec stdout:', execResult.stdout)
  console.log('Exec exit code:', execResult.exitCode)

  // ── File Operations ─────────────────────────────────────────
  // Read, write, and list files in the agent's sandbox

  await agent.files.write('/data/report.txt', 'Quarterly revenue: $1.2M')
  await agent.files.write('/data/config.json', JSON.stringify({ version: 2 }))

  const content = await agent.files.read('/data/report.txt')
  console.log('File content:', content.toString())

  const files = await agent.files.list('/data')
  console.log('Files:', files.map(f => `${f.name} (${f.size}b)`))

  // ── Agent Lifecycle ─────────────────────────────────────────
  // Pause snapshots the sandbox, resume restores it

  const status = await agent.status()
  console.log('Status:', status.status, '— cost so far:', status.cost)

  const snapshot = await agent.pause()
  console.log('Paused — snapshot:', snapshot.id, '— size:', snapshot.size)

  await agent.resume()
  console.log('Resumed — status:', agent.currentStatus)

  // ── List and Manage ─────────────────────────────────────────

  const agents = await session.agents.list()
  console.log('Active agents:', agents.length)

  // Update session limits on the fly
  await session.updateLimits({ maxAgents: 10 })

  // Pause the entire session (pauses all agents)
  await session.pause()
  console.log('Session paused:', session.status)

  await session.resume()
  console.log('Session resumed:', session.status)

  // Clean up
  await agent.terminate()
  await session.terminate()
  console.log('Session terminated:', session.status)
}

main().catch(console.error)
