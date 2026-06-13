/**
 * Theazo — Bring Your Own Infrastructure (BYOI)
 *
 * Two independent knobs — mix and match:
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  BRING YOUR OWN COMPUTE                                        │
 * │                                                                 │
 * │  Use your own sandbox provider instead of Theazo's.             │
 * │  Theazo bills $0 for compute — you pay your provider directly.  │
 * │                                                                 │
 * │  Supported:                                                     │
 * │    • E2B         → credentialRef: 'e2b_key'                     │
 * │    • Fly.io      → credentialRef: 'fly_token'                   │
 * │    • Custom/K8s  → config.endpoint: 'https://your-compute/...' │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  BRING YOUR OWN MODELS                                         │
 * │                                                                 │
 * │  Use your own model provider instead of Theazo's.               │
 * │  Theazo bills $0 for model tokens — you pay your provider.      │
 * │                                                                 │
 * │  Option A — Direct provider key:                                │
 * │    • Anthropic   → credentialRef: 'anthropic_key'               │
 * │    • OpenAI      → credentialRef: 'openai_key'                  │
 * │                                                                 │
 * │  Option B — Any AI gateway (OpenAI-compatible):                 │
 * │    • OpenRouter   → baseUrl: 'https://openrouter.ai/api/v1'    │
 * │    • LiteLLM      → baseUrl: 'https://litellm.your-server/v1'  │
 * │    • Azure OpenAI → baseUrl: 'https://your.openai.azure.com/...'│
 * │    • vLLM / Ollama → baseUrl: 'http://localhost:8000/v1'        │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Setup (one-time, via REST API or dashboard):
 *
 *   # 1. Store keys in the encrypted vault
 *   curl -X POST https://api.theazo.com/v1/secrets \
 *     -H "Authorization: Bearer th_live_..." \
 *     -d '{"e2b_key":"e2b_sk_...","openrouter_key":"sk-or-..."}'
 *
 *   # 2. Bring your own compute (pick one)
 *   curl -X PUT https://api.theazo.com/v1/providers/e2b \
 *     -H "Authorization: Bearer th_live_..." \
 *     -d '{"credentialRef":"e2b_key"}'
 *
 *   # 3. Bring your own models (pick one)
 *   #    Direct key:
 *   curl -X PUT https://api.theazo.com/v1/providers/anthropic \
 *     -H "Authorization: Bearer th_live_..." \
 *     -d '{"credentialRef":"anthropic_key"}'
 *
 *   #    Or AI gateway:
 *   curl -X PUT https://api.theazo.com/v1/providers/openai \
 *     -H "Authorization: Bearer th_live_..." \
 *     -d '{"credentialRef":"openrouter_key","config":{"baseUrl":"https://openrouter.ai/api/v1"}}'
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  // SDK works exactly the same — BYOI is transparent
  const session = await theazo.sessions.forUser('byoi_user')
  const result = await session.run('researcher', 'analyze AI agent market')

  console.log('Output:', result.output)
  console.log('Cost:', result.cost)
  // → { amount: 2, currency: 'usd' }  ← orchestration only

  // Check the cost split
  const usage = await theazo.usage.forUser('byoi_user')
  console.log('Theazo billed:', usage.total)    // orchestration fees only
  console.log('Compute cost:', usage.compute)   // $0 — you pay your provider
  console.log('Model cost:', usage.models)      // $0 — you pay your provider
}

main().catch(console.error)
