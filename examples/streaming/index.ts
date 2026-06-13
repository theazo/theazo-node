/**
 * Theazo — Streaming Example
 *
 * Watch agent output arrive token by token in real-time.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  const session = await theazo.sessions.forUser('stream_user')

  // Create a conversation and stream the response
  const conv = await session.chat.create({ agent: 'assistant' })

  process.stdout.write('Agent: ')
  for await (const event of session.chat.stream(conv.id, {
    content: 'Write a haiku about AI agents',
  })) {
    if (event.type === 'text') {
      process.stdout.write(event.text) // tokens arrive one by one
    }
    if (event.type === 'done') {
      console.log(`\n\nTokens: ${event.usage.input}in / ${event.usage.output}out`)
      console.log(`Cost: $${(event.cost / 100).toFixed(2)}`)
    }
  }
}

main().catch(console.error)
