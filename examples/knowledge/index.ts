/**
 * Theazo — Knowledge / RAG Example
 *
 * Upload a document and let the agent use it as context.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  const session = await theazo.sessions.forUser('knowledge_user')

  // Upload a document to a knowledge collection
  const pricingContent = `
    Theazo Pricing:
    - Free: 500 credits/mo, 1 agent
    - Pro: $99/mo, 5000 credits, unlimited agents
    - Enterprise: Custom pricing, VPC, SSO
  `
  await session.knowledge.upload({
    collection: 'company-docs',
    files: [{ filename: 'pricing.md', content: Buffer.from(pricingContent) }],
  })
  console.log('Document uploaded')

  // Query the knowledge base directly
  const results = await session.knowledge.query('What is the Pro plan pricing?', {
    collection: 'company-docs',
  })
  console.log('Top result:', results[0]?.content)

  // Or run an agent that has access to the knowledge base
  const result = await session.run('assistant', 'What is the Pro plan pricing?')

  console.log('Answer:', result.output) // cites the uploaded document
}

main().catch(console.error)
