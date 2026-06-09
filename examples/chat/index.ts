/**
 * Theazo — Chat Example
 *
 * Multi-turn conversation with an AI agent. Messages stream in real-time.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  const session = await theazo.sessions.forUser('chat_user')

  // Start a conversation
  const chat = await session.chat.create({ agent: 'assistant' })
  console.log('Conversation:', chat.id)

  // Send a message and get the response
  const reply = await chat.send('What are the top 3 programming languages in 2026?')
  console.log('Agent:', reply.content)

  // Follow up — the agent remembers context
  const followUp = await chat.send('Which one is best for building AI agents?')
  console.log('Agent:', followUp.content)
  console.log('Cost:', followUp.cost)
}

main().catch(console.error)
