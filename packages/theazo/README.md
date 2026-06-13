# theazo

Agent infrastructure for developers. Per-user compute, billing, observability — one SDK.

[![npm version](https://img.shields.io/npm/v/theazo.svg?style=flat&color=15803d)](https://www.npmjs.com/package/theazo)
[![license](https://img.shields.io/github/license/theazo/theazo-node?color=333)](https://github.com/theazo/theazo-node/blob/main/LICENSE)

## Install

```bash
npm install theazo
```

## Quick Start

```typescript
import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY })

const session = await theazo.sessions.forUser('user_123')
const result = await session.run('researcher', 'analyze competitor pricing')

console.log(result.output)  // "Based on analysis of 12 competitors..."
console.log(result.cost)    // { amount: 3, currency: 'usd' }
```

## Features

| | |
|---|---|
| **Sessions** | Per-user isolation — User A can't see User B's data |
| **Agents** | Sandboxed Python/Node/Go compute via E2B, Fly, or your own infra |
| **Workflows** | Multi-step pipelines — sequential, parallel, conditional, dynamic DAGs |
| **Fleets** | Batch N tasks in parallel with concurrency control |
| **Chat** | Multi-turn conversations with streaming + context strategies |
| **Knowledge** | Upload docs → agents query them automatically (RAG) |
| **MCP Tools** | Connect external tool servers — agents use tools automatically |
| **Channels** | Chat widget, Slack, email |
| **Scheduling** | Cron schedules + webhook triggers |
| **Approvals** | Human-in-the-loop — pause for approval before sensitive actions |
| **Billing** | Per-user cost tracking, budget caps, usage export |
| **BYOI** | Bring your own compute and/or models — $0 on Theazo bill |

## Three Modes

**Fully Managed** — Theazo handles compute, models, and orchestration:
```typescript
const result = await session.run('researcher', 'analyze pricing')
```

**Infra-Only** — Run your own agent code in a Theazo sandbox:
```typescript
const agent = await session.agents.create({ compute: 'python' })
await agent.exec('python', 'from langgraph import ...')
```

**BYOI** — Bring your own E2B/Fly keys or any AI gateway (OpenRouter, LiteLLM, Azure, vLLM):
```typescript
// Configure via dashboard or REST API, then SDK works the same
const result = await session.run('researcher', 'analyze market')
console.log(result.cost) // orchestration only — compute + model = $0
```

## Workflows

```typescript
import { workflow } from 'theazo'

const pipeline = workflow('research-report')
  .step('research', { agent: 'researcher', input: { topic: '$.trigger.topic' } })
  .step('analyze', { agent: 'analyst', input: { data: '$.research.output' } })
  .step('write', { agent: 'writer', input: { analysis: '$.analyze.output' } })
  .build()
```

9 step types: `agent` · `parallel` · `condition` · `transform` · `map` · `delay` · `approval` · `webhook` · `planner`

## Links

- [Documentation](https://theazo.com/docs)
- [API Reference](https://theazo.com/docs/api-reference)
- [Examples](https://github.com/theazo/theazo-node/tree/main/examples) (13 examples)
- [GitHub](https://github.com/theazo/theazo-node)

## Requirements

Node.js 18+ · TypeScript 5+ (recommended)

## License

MIT
