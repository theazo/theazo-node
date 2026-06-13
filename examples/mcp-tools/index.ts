/**
 * Theazo — MCP Tools Example
 *
 * Connect an external MCP server (GitHub, Slack, etc.)
 * and let agents use its tools automatically.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  // Connect a GitHub MCP server
  const connection = await theazo.mcp.connect({
    name: 'github',
    transport: 'sse',
    url: 'https://mcp-github.example.com/sse',
    credentials: 'platform', // or 'per_user' for user-specific auth
  })
  console.log('Connected:', connection.id)
  console.log('Tools discovered:', connection.tools.map(t => t.name))
  // → ['github_create_issue', 'github_search_repos', 'github_get_file']

  // Agent automatically discovers and uses MCP tools
  const session = await theazo.sessions.forUser('mcp_user')
  const result = await session.run('developer', 'Find open issues labeled "bug" in our repo', {
    mcp: [connection.id], // attach MCP servers to this agent run
  })

  console.log('Output:', result.output)
  // The agent called github_search_repos and github_list_issues automatically
}

main().catch(console.error)
