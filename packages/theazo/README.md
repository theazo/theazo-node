<p align="center">
  <a href="https://theazo.com">
    <img src="https://raw.githubusercontent.com/theazo/theazo-node/main/logo.png" width="48" alt="Theazo" />
  </a>
</p>

<h1 align="center">theazo</h1>

<p align="center">
  <strong>Agent infrastructure for production.</strong>
  <br />
  Sandboxed compute, workflows, fleets, chat, RAG, MCP tools, per-user billing, BYOI.
  <br />
  One SDK to replace 12-16 weeks of infrastructure.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/theazo"><img src="https://img.shields.io/npm/v/theazo.svg?style=flat&color=15803d" alt="npm" /></a>
  <a href="https://github.com/theazo/theazo-node/blob/main/LICENSE"><img src="https://img.shields.io/github/license/theazo/theazo-node?color=333" alt="license" /></a>
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

// Session per user — isolated compute, billing, cost limits
const session = await theazo.sessions.forUser('user_123')

// One-liner: sandbox + Claude + tools + cost tracking
const result = await session.run('researcher', 'analyze competitor pricing')

console.log(result.output)   // "Based on analysis of 12 competitors..."
console.log(result.cost)     // { amount: 3, currency: 'usd' }
```

---

## Infrastructure

Everything you'd spend 12-16 weeks building, included out of the box.

| | |
|---|---|
| **Sessions** | Per-user isolation — User A can't see User B's data, agents, or costs |
| **Agents** | Sandboxed Python/Node/Go compute. Managed (E2B) or bring your own |
| **Billing** | Per-user cost tracking, 4-level budget caps (platform/user/session/run), threshold alerts |
| **Observability** | Real-time logs, traces, cost breakdown per agent and per user |
| **Cost Controls** | Auto-pause when limits hit. No surprise bills. |
| **Streaming** | Token-by-token SSE for real-time agent output |
| **Model Gateway** | 500+ models. Managed or BYOI (direct key, OpenRouter, LiteLLM, Azure, vLLM, Ollama) |
| **Secrets Vault** | AES-256-GCM encrypted credentials. Injected at runtime. Never logged. |

## Primitives

Agent orchestration building blocks. Your product, Theazo's backend.

| | |
|---|---|
| **Workflows** | Multi-step pipelines — 9 step types, parallel branches, conditional logic, dynamic DAGs |
| **Fleets** | Batch N tasks in parallel with concurrency control and cost caps |
| **Chat** | Multi-turn conversations with streaming, context strategies, threads |
| **Knowledge / RAG** | Upload docs → agents query them automatically via pgvector |
| **MCP Tools** | Connect external tool servers — agents discover and use tools automatically |
| **Channels** | Chat widget, Slack, email — agents meet users where they are |
| **Scheduling** | Cron schedules + webhook triggers for recurring agent tasks |
| **Approvals** | Human-in-the-loop — pause for approval before sensitive actions |
| **Agent Store** | Save, version, rollback, duplicate agent definitions |
| **Guardrails** | PII detection, prompt injection protection, content filtering |

---

## Three Modes

**Fully Managed** — Theazo handles compute, models, and orchestration:
```typescript
const result = await session.run('researcher', 'analyze pricing')
// compute + model + tools + billing — all handled
```

**Infra-Only** — Run your own agent code (LangGraph, CrewAI) in a Theazo sandbox:
```typescript
const agent = await session.agents.create({ compute: 'python' })
const result = await agent.exec('python', myLangGraphCode)
// You run the agent loop. Theazo handles compute, isolation, billing.
```

**BYOI** — Bring your own compute and/or models:
```typescript
// Configure via dashboard or REST API — then SDK works the same
const result = await session.run('researcher', 'analyze market')
console.log(result.cost) // orchestration only — compute + model = $0
```

Supports: E2B, Fly.io, custom K8s (compute) + Anthropic, OpenAI, OpenRouter, LiteLLM, Azure, vLLM, Ollama (models).

---

## Workflows

```typescript
import { Theazo, workflow } from 'theazo'

const pipeline = workflow('research-report')
  .step('research', { agent: 'researcher', input: { topic: '$.trigger.topic' } })
  .step('analyze', { agent: 'analyst', input: { data: '$.research.output' } })
  .step('write', { agent: 'writer', input: { analysis: '$.analyze.output' } })
  .build()

const wf = await theazo.workflows.create(pipeline)

for await (const event of theazo.workflows.streamRun(wf.id, { input: { topic: 'AI agents' } })) {
  if (event.event === 'step.completed') console.log(`✓ ${event.stepId} — $${event.cost / 100}`)
}
```

**Step types:** `agent` · `parallel` · `condition` · `transform` · `map` · `delay` · `approval` · `webhook` · `planner` (dynamic DAG — agent decides what steps to add at runtime)

---

## Fleets

```typescript
const fleet = await session.fleets.dispatch({
  agent: 'researcher',
  inputs: companies.map(c => ({ company: c })),
  concurrency: 5,
})

for await (const item of fleet.stream()) {
  console.log(`Done: ${item.input.company} — $${item.cost / 100}`)
}
```

---

## Chat + Streaming

```typescript
// Multi-turn conversation
const conv = await session.chat.create({ agent: 'assistant' })
const reply = await session.chat.send(conv.id, { content: 'What is Theazo?' })

// Stream tokens
for await (const event of session.chat.stream(conv.id, { content: 'Write a haiku' })) {
  if (event.type === 'text') process.stdout.write(event.text)
}
```

---

## Knowledge / RAG

```typescript
await session.knowledge.upload({
  collection: 'docs',
  source: 'text',
  content: 'Theazo pricing: Free $0, Pro $99/mo...',
  filename: 'pricing.md',
})

// Agent uses knowledge automatically
const result = await session.run('assistant', 'What does Pro cost?', {
  knowledge: 'docs',
})
```

---

## MCP Tools

```typescript
const conn = await theazo.mcp.connect({
  name: 'github',
  transport: 'sse',
  url: 'https://mcp-github.example.com/sse',
})
// Agent discovers: github_create_issue, github_search_repos, ...

const result = await session.run('developer', 'Find open bugs in our repo', {
  mcp: [conn.id],
})
```

---

## Examples

13 runnable examples at [github.com/theazo/theazo-node/examples](https://github.com/theazo/theazo-node/tree/main/examples):

basic-agent · streaming · chat · workflows · fleet-dispatch · agent-definitions · mcp-tools · approvals · byoi · knowledge · scheduling · channels · infra-only

## Documentation

[theazo.com/docs](https://theazo.com/docs) — Getting started, API reference, BYOI guide, workflows, billing.

## Requirements

Node.js 18+ · TypeScript 5+ (recommended)

## License

MIT
