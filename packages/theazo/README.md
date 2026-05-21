# theazo

Agent infrastructure for developers. Multi-tenant compute, per-user billing, observability — one SDK.

## Install

```bash
npm install theazo
```

## Quick Start

```typescript
import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY })

// Session per user — isolation, billing, cost limits
const session = await theazo.sessions.forUser('user_123', {
  limits: { maxCost: { amount: 500, currency: 'usd', period: 'day' } }
})

// Run an agent — Claude + sandbox + cost tracking
const result = await session.run('researcher', 'analyze competitor pricing')
console.log(result.output)  // "Competitor analysis: ..."
console.log(result.cost)    // { amount: 3, currency: 'usd' }
```

## What You Get

- **Multi-tenant sessions** — per-user isolation, billing, cost limits
- **Agent lifecycle** — create, run, pause, resume, snapshot, destroy
- **Streaming** — SSE/WebSocket for real-time output
- **Observability** — logs, traces, metrics per agent
- **Cost controls** — per-session caps, auto-pause on limit
- **Workflows** — multi-agent pipelines with DAG execution
- **Fleet dispatch** — process N items in parallel
- **Agent teams** — sequential, collaborative, hierarchical coordination
- **Knowledge / RAG** — per-user vector store
- **Chat** — conversations, threads, context management
- **Tools + MCP** — built-in tools + MCP multi-server client
- **Guardrails** — PII detection, prompt injection, content filtering
- **Webhooks** — HMAC-signed with retry

## Three Modes

### Full Platform
```typescript
const result = await session.run('researcher', 'analyze pricing')
// Theazo handles: compute, model calls, tools, billing, observability
```

### Infra-only (bring your own agent framework)
```typescript
const agent = await session.agents.create({ compute: 'python' })
await agent.exec('python', 'from langgraph import ...')
// You handle model calls. Theazo handles: compute, isolation, cost tracking
```

### BYOI (bring your own infrastructure)
```typescript
const theazo = new Theazo({
  apiKey: 'th_...',
  compute: { provider: 'e2b', credentials: { apiKey: '...' } },
})
// You pay your provider directly. Theazo handles: orchestration, billing data
```

## API Reference

See [docs.theazo.com](https://theazo.com/docs) for the full API reference.

## License

MIT
