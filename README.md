<p align="center">
  <a href="https://theazo.com">
    <img src="https://theazo.com/logo.svg" width="40" alt="Theazo" />
  </a>
</p>

<h1 align="center">Theazo Node.js SDK</h1>

<p align="center">
  Agent infrastructure for developers — sessions, compute, billing, observability.
  <br />
  <a href="https://theazo.com/docs"><strong>Docs</strong></a> · <a href="https://theazo.com/pricing"><strong>Pricing</strong></a> · <a href="https://discord.gg/theazo"><strong>Discord</strong></a> · <a href="https://github.com/theazo/theazo-node/issues"><strong>Issues</strong></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/theazo"><img src="https://img.shields.io/npm/v/theazo.svg?style=flat&color=15803d" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/theazo"><img src="https://img.shields.io/npm/dm/theazo.svg?style=flat&color=333" alt="npm downloads" /></a>
  <a href="https://github.com/theazo/theazo-node/blob/main/LICENSE"><img src="https://img.shields.io/github/license/theazo/theazo-node?color=333" alt="license" /></a>
  <a href="https://discord.gg/theazo"><img src="https://img.shields.io/discord/1234567890?color=5865F2&label=discord&logo=discord&logoColor=white" alt="discord" /></a>
</p>

---

## Install

```bash
npm install theazo
```

## Quick Start

```typescript
import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY })

// Create a session for your user — isolated compute, billing, limits
const session = await theazo.sessions.forUser('user_123')

// Run an agent — creates sandbox, runs task with Claude, returns result
const result = await session.run('researcher', 'analyze competitor pricing')

console.log(result.output)  // "Competitor analysis: ..."
console.log(result.cost)    // { amount: 3, currency: 'usd' }
```

## What You Get

```
One SDK call → sandboxed compute, per-user billing, observability, cost controls.
```

| Feature | What it does |
|---------|-------------|
| **Sessions** | Per-user isolation — User A can't see User B's data |
| **Agents** | Sandboxed Python/Node/Go compute via E2B, Fly, or your own infra |
| **Workflows** | Multi-step pipelines with conditional branching, parallel execution, dynamic DAGs |
| **Fleets** | Batch N tasks in parallel with concurrency control |
| **Chat** | Multi-turn conversations with streaming + context strategies |
| **Knowledge** | Upload docs → agents use them automatically (pgvector RAG) |
| **Channels** | Chat widget, Slack, email — agents meet users where they are |
| **Billing** | Per-user cost tracking, budget caps, usage export for Stripe |
| **BYOI** | Bring your own E2B/Fly keys or any OpenAI-compatible model gateway |

## Packages

| Package | Description |
|---------|-------------|
| [`theazo`](./packages/theazo) | Main SDK — sessions, agents, workflows, fleets, billing |
| [`theazo-sandbox`](./packages/theazo-sandbox) | Lightweight sandbox bridge (~5KB) for infra-only mode |

## Examples

Every example is 30-40 lines, copy-paste ready. Set `THEAZO_API_KEY` and run.

| Example | What it shows |
|---------|--------------|
| [basic-agent](./examples/basic-agent) | Create a session, run an agent, get results |
| [chat](./examples/chat) | Multi-turn conversation with context |
| [workflows](./examples/workflows) | Multi-step pipeline with typed builder |
| [fleet-dispatch](./examples/fleet-dispatch) | Batch 10 tasks in parallel |
| [byoi](./examples/byoi) | Bring your own E2B + Anthropic keys |
| [knowledge](./examples/knowledge) | Upload docs, agent uses them as context |
| [scheduling](./examples/scheduling) | Cron schedules + webhook triggers |
| [channels](./examples/channels) | Chat widget for your website |

```bash
cd examples/basic-agent
export THEAZO_API_KEY=th_live_...
npx tsx index.ts
```

## BYOI — Bring Your Own Infrastructure

Use Theazo's managed compute, or bring your own. Same SDK either way.

```typescript
// Store your keys in the encrypted vault
await theazo.secrets.set({ e2b_key: process.env.E2B_API_KEY })
await theazo.secrets.set({ anthropic_key: process.env.ANTHROPIC_API_KEY })

// Configure BYOI — agents use YOUR keys
await theazo.providers.configure('e2b', { credentialRef: 'e2b_key' })
await theazo.providers.configure('anthropic', { credentialRef: 'anthropic_key' })

// Same API, your infrastructure. Theazo bills orchestration only.
const result = await session.run('researcher', 'analyze market')
```

## Documentation

- [**Getting Started**](https://theazo.com/docs) — 5-minute quickstart
- [**API Reference**](https://theazo.com/docs/api-reference) — Every endpoint documented
- [**BYOI Guide**](https://theazo.com/docs/byoi) — Bring your own compute + models
- [**Billing**](https://theazo.com/docs/billing) — Credits, budgets, per-user metering
- [**Workflows**](https://theazo.com/docs/workflows) — DAG pipelines with 9 step types

## Contributing

```bash
git clone https://github.com/theazo/theazo-node.git
cd theazo-node
pnpm install
pnpm build
```

## License

[MIT](./LICENSE)
