/**
 * Theazo — Bring Your Own Infrastructure (BYOI) Example
 *
 * Use your own E2B key for compute and your own Anthropic key for models.
 * Theazo charges orchestration only — $0 for compute and model usage.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  // Store your provider keys in the secrets vault (encrypted, never logged)
  await theazo.secrets.set({ e2b_key: process.env.E2B_API_KEY! })
  await theazo.secrets.set({ anthropic_key: process.env.ANTHROPIC_API_KEY! })

  // Configure BYOI compute — agents run on YOUR E2B account
  await theazo.providers.configure('e2b', { credentialRef: 'e2b_key' })

  // Configure BYOI models — model calls use YOUR Anthropic key
  await theazo.providers.configure('anthropic', { credentialRef: 'anthropic_key' })

  // Run an agent — same API, your keys
  const session = await theazo.sessions.forUser('byoi_user')
  const result = await session.run('researcher', 'analyze AI agent market')

  console.log('Output:', result.output)
  console.log('Cost:', result.cost) // orchestration only — compute + model = $0
}

main().catch(console.error)
