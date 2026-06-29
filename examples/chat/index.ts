/**
 * Theazo — Chat Example
 *
 * Full chat API surface:
 *   - Create conversations with context management
 *   - Multi-turn messaging with memory
 *   - Stream responses token-by-token
 *   - Message history and search
 *   - Threads (branching conversations)
 *   - Context injection and handoff
 *   - Archive/unarchive lifecycle
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  const session = await theazo.sessions.forUser('chat_user')

  // ── Create Conversation ─────────────────────────────────────
  // Configure the agent, context strategy, and system prompt

  const conv = await session.chat.create({
    agent: 'assistant',
    title: 'Product Questions',
    systemPrompt: 'You are a helpful product assistant. Keep replies under 100 words.',
    context: { strategy: 'sliding_window', maxTokens: 4000 },
    metadata: { source: 'web', userId: 'chat_user' },
  })
  console.log('Conversation:', conv.id, '— status:', conv.status)

  // ── Multi-Turn Messaging ────────────────────────────────────
  // Send messages — the agent remembers the full conversation

  const reply1 = await session.chat.send(conv.id, {
    content: 'What is the capital of France?',
  })
  console.log('Agent:', reply1.content)
  console.log('Cost:', reply1.cost, '— tokens:', reply1.tokenCount)

  const reply2 = await session.chat.send(conv.id, {
    content: 'What about Germany?',
  })
  console.log('Agent:', reply2.content)

  // Context retention — the agent should remember France
  const reply3 = await session.chat.send(conv.id, {
    content: 'What was the first country I asked about?',
  })
  console.log('Agent:', reply3.content) // Should mention France

  // ── Stream a Response ───────────────────────────────────────
  // Get tokens as they arrive — for real-time UIs

  process.stdout.write('\nStreaming: ')
  for await (const event of session.chat.stream(conv.id, {
    content: 'List 3 programming languages in one sentence.',
  })) {
    if (event.type === 'text') {
      process.stdout.write(event.text)
    }
    if (event.type === 'done') {
      console.log(`\n(cost: ${event.cost.amount}c, tokens: ${event.tokenCount})`)
    }
  }

  // ── Message History ─────────────────────────────────────────
  // Retrieve past messages with pagination

  const history = await session.chat.messages(conv.id, { order: 'asc', limit: 20 })
  console.log('\nMessage history:')
  for (const msg of history.data) {
    console.log(`  [${msg.role}] ${(msg.content ?? '').substring(0, 60)}...`)
  }
  console.log(`  (${history.data.length} messages, hasMore: ${history.hasMore})`)

  // ── Context State ───────────────────────────────────────────
  // See how the context window is being managed

  const ctx = await session.chat.context(conv.id)
  console.log('Context:', {
    totalMessages: ctx.totalMessages,
    contextMessages: ctx.contextMessages,
    contextTokens: ctx.contextTokens,
    strategy: ctx.strategy,
    summary: ctx.summary ? 'yes' : 'no',
  })

  // Inject additional context (system messages mid-conversation)
  await session.chat.injectContext(conv.id, {
    content: 'The user is on the Pro plan. Mention upgrade options if relevant.',
    role: 'system',
  })

  // ── Threads ─────────────────────────────────────────────────
  // Branch a side conversation from any message

  const thread = await session.chat.createThread(conv.id, {
    parentMessageId: history.data[history.data.length - 1].id,
    title: 'Follow-up about languages',
  })
  console.log('Thread:', thread.id, '— parent:', thread.parentMessageId)

  const threads = await session.chat.threads(conv.id)
  console.log('Total threads:', threads.length)

  // ── Search ──────────────────────────────────────────────────
  // Full-text search across all conversations

  const results = await session.chat.search({ query: 'France', limit: 5 })
  console.log('Search "France":', results.length, 'results')
  for (const r of results) {
    console.log(`  score: ${r.score} — "${r.content.substring(0, 50)}..."`)
  }

  // ── Conversation Management ─────────────────────────────────
  // Update, archive, list conversations

  await session.chat.update(conv.id, { title: 'Geography Questions' })

  const convos = await session.chat.list({ status: 'active', limit: 10 })
  console.log('Active conversations:', convos.data.length)

  // Archive (soft delete) and restore
  await session.chat.archive(conv.id)
  const archived = await session.chat.get(conv.id)
  console.log('Archived:', archived.status)

  await session.chat.unarchive(conv.id)
  const restored = await session.chat.get(conv.id)
  console.log('Restored:', restored.status)

  // ── Handoff ─────────────────────────────────────────────────
  // Transfer conversation to a human or different agent

  const handoff = await session.chat.handoff(conv.id, {
    reason: 'Customer wants to speak with a human',
    to: 'human',
  })
  console.log('Handoff:', handoff.id, '— status:', handoff.status)

  // In production, a human agent picks it up, then:
  await session.chat.resolveHandoff(conv.id)
  console.log('Handoff resolved')

  await session.terminate()
}

main().catch(console.error)
