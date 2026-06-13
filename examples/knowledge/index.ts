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
  await session.knowledge.upload({
    collection: 'company-docs',
    source: 'text',
    content: `
      Theazo Pricing:
      - Free: 500 credits/mo, 1 agent
      - Pro: $99/mo, 5000 credits, unlimited agents
      - Enterprise: Custom pricing, VPC, SSO
    `,
    filename: 'pricing.md',
  })
  console.log('Document uploaded')

  // Agent automatically searches the knowledge base when needed
  const result = await session.run('assistant', 'What is the Pro plan pricing?', {
    knowledge: 'company-docs',
  })

  console.log('Answer:', result.output) // cites the uploaded document
}

main().catch(console.error)
