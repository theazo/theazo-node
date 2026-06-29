/**
 * Theazo — Knowledge / RAG Example
 *
 * Full knowledge API surface:
 *   - Upload documents (text, markdown, PDF)
 *   - Sync from external sources (Notion, Google Drive, GitHub)
 *   - Query with relevance scoring
 *   - Cross-collection search
 *   - Stats, sources, cleanup
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  const session = await theazo.sessions.forUser('knowledge_user')

  // ── Upload Documents ────────────────────────────────────────
  // Upload to a named collection — auto-chunked and embedded

  await session.knowledge.upload({
    collection: 'product-docs',
    files: [
      {
        filename: 'pricing.md',
        content: Buffer.from(`
# Pricing
- Free: 500 credits/mo, 1 agent
- Pro: $99/mo, 5000 credits, unlimited agents
- Enterprise: Custom pricing, VPC, SSO
        `),
        mimeType: 'text/markdown',
      },
      {
        filename: 'faq.md',
        content: Buffer.from(`
# FAQ
Q: What runtimes are supported?
A: Python, Node.js, and Go sandboxes.

Q: Can I bring my own compute?
A: Yes — E2B, Fly.io, or any K8s cluster.

Q: How does billing work?
A: Per-session in integer cents. Track per-user costs via the usage API.
        `),
        mimeType: 'text/markdown',
      },
    ],
  })
  console.log('Uploaded 2 documents to product-docs')

  // Upload to a second collection
  await session.knowledge.upload({
    collection: 'engineering-docs',
    files: [
      {
        filename: 'architecture.md',
        content: Buffer.from(`
# Architecture
The platform uses a session-based isolation model.
Each user gets their own compute sandbox, billing scope, and knowledge base.
Agent state persists within a session via snapshots.
        `),
      },
    ],
  })
  console.log('Uploaded 1 document to engineering-docs')

  // ── Query Knowledge Base ────────────────────────────────────
  // Semantic search with relevance scores

  const pricingResults = await session.knowledge.query('What is the Pro plan pricing?', {
    collection: 'product-docs',
    topK: 3,
  })
  console.log('\nQuery: "Pro plan pricing"')
  for (const r of pricingResults) {
    console.log(`  score: ${r.score.toFixed(3)} — [${r.source}] ${r.content.substring(0, 80)}...`)
  }

  // Cross-collection query (no collection filter)
  const archResults = await session.knowledge.query('How does session isolation work?', {
    topK: 3,
  })
  console.log('\nQuery: "session isolation" (cross-collection)')
  for (const r of archResults) {
    console.log(`  score: ${r.score.toFixed(3)} — [${r.source}] ${r.content.substring(0, 80)}...`)
  }

  // ── Sync from External Source ───────────────────────────────
  // Auto-sync from Notion, Google Drive, GitHub, etc.

  await session.knowledge.sync({
    source: {
      type: 'notion',
      config: {
        databaseId: 'abc123',
        // credentials stored in Theazo secrets vault
      },
    },
    collection: 'team-wiki',
    schedule: '0 */6 * * *', // sync every 6 hours
  })
  console.log('Notion sync configured')

  // ── Stats and Sources ───────────────────────────────────────

  const stats = await session.knowledge.stats()
  console.log('\nKnowledge stats:', {
    collections: stats.collections,
    totalChunks: stats.totalChunks,
    totalTokens: stats.totalTokens,
    storageGB: stats.storageGB,
  })

  const sources = await session.knowledge.sources()
  console.log('Sources:')
  for (const s of sources) {
    console.log(`  [${s.source}] ${s.collection ?? 'default'} — ${s.chunkCount} chunks — ${s.status}`)
  }

  // ── Cleanup ─────────────────────────────────────────────────

  await session.knowledge.deleteCollection('product-docs')
  await session.knowledge.deleteCollection('engineering-docs')
  console.log('\nCollections deleted')

  const afterStats = await session.knowledge.stats()
  console.log('After cleanup:', afterStats)

  await session.terminate()
}

main().catch(console.error)
