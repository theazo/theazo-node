/**
 * Theazo — Streaming Example
 *
 * Two types of streaming:
 *   1. Chat streaming — token-by-token responses in conversations
 *   2. Agent streaming — real-time events during agent task execution
 *
 * Both use AsyncIterable — just `for await` over them.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  const session = await theazo.sessions.forUser('stream_user')

  // ── Chat Streaming ──────────────────────────────────────────
  // Token-by-token responses for real-time UIs

  const conv = await session.chat.create({ agent: 'assistant' })

  console.log('Chat stream:')
  process.stdout.write('  Agent: ')
  for await (const event of session.chat.stream(conv.id, {
    content: 'Write a haiku about AI agents',
  })) {
    switch (event.type) {
      case 'text':
        process.stdout.write(event.text)
        break
      case 'tool_call':
        console.log(`\n  [calling ${event.name}...]`)
        break
      case 'tool_result':
        console.log(`  [${event.name} returned: ${event.output.substring(0, 50)}...]`)
        break
      case 'done':
        console.log(`\n  Tokens: ${event.tokenCount}`)
        console.log(`  Cost: $${(event.cost.amount / 100).toFixed(2)}`)
        break
    }
  }

  // ── Agent Streaming ─────────────────────────────────────────
  // Real-time events during task execution: text, tool calls, progress

  const agent = await session.agents.create({
    compute: 'python',
    model: 'anthropic/claude-sonnet-4-20250514',
    instructions: 'Be concise.',
  })

  console.log('\nAgent stream:')
  process.stdout.write('  ')
  for await (const event of agent.stream('Count from 1 to 5 and explain each number briefly')) {
    switch (event.type) {
      case 'text':
        process.stdout.write(event.text)
        break
      case 'tool_call':
        console.log(`\n  [tool: ${event.tool}]`)
        break
      case 'tool_result':
        console.log(`  [result: ${event.output.substring(0, 80)}]`)
        break
      case 'progress':
        console.log(`  [progress: ${event.percentage ?? '?'}% — ${event.message}]`)
        break
      case 'done':
        console.log(`\n  Duration: ${event.duration}`)
        console.log(`  Cost: $${(event.cost.amount / 100).toFixed(2)}`)
        console.log(`  Artifacts: ${event.artifacts.length}`)
        break
    }
  }

  // ── Abort a Stream ──────────────────────────────────────────
  // Use AbortController to cancel mid-stream

  const controller = new AbortController()
  setTimeout(() => controller.abort(), 2000) // cancel after 2 seconds

  console.log('\nAbortable stream (cancels after 2s):')
  process.stdout.write('  ')
  try {
    for await (const event of session.chat.stream(conv.id, {
      content: 'Write a very long essay about the history of computing.',
      signal: controller.signal,
    })) {
      if (event.type === 'text') process.stdout.write(event.text)
    }
  } catch {
    console.log('\n  (stream aborted)')
  }

  await session.terminate()
}

main().catch(console.error)
