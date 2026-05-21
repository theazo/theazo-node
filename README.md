# theazo-node

Official TypeScript SDK for [Theazo](https://theazo.com) — agent infrastructure for developers.

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [`theazo`](./packages/theazo) | `npm install theazo` | Main SDK — sessions, agents, workflows, fleets, billing |
| [`theazo-sandbox`](./packages/theazo-sandbox) | `npm install theazo-sandbox` | Lightweight sandbox bridge (~5KB) for infra-only mode |

## Quick Start

```bash
npm install theazo
```

```typescript
import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY })

const session = await theazo.sessions.forUser('user_123')
const result = await session.run('researcher', 'analyze competitor pricing')

console.log(result.output)  // "Competitor analysis: ..."
console.log(result.cost)    // { amount: 3, currency: 'usd' }
```

## Examples

| Example | Description |
|---------|-------------|
| [basic-agent](./examples/basic-agent) | Create a session, run an agent, get results |

## Development

```bash
pnpm install
pnpm build
```

## License

MIT
