/**
 * Theazo — MCP Tools Example
 *
 * Connect external MCP servers and let agents use their tools:
 *   - Connect via SSE, streamable-http, or stdio
 *   - Auto-discover available tools
 *   - Per-user credentials for multi-tenant setups
 *   - Health checks and tool refresh
 *   - Expose your own tools as an MCP server
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  // ── Connect an MCP Server ───────────────────────────────────
  // Agents automatically discover and use the server's tools

  const github = await theazo.mcp.connect({
    name: 'github',
    transport: 'sse',
    url: 'https://mcp-github.example.com/sse',
    credentialsType: 'platform', // one key for all users
    toolFilter: ['github_search_repos', 'github_list_issues', 'github_get_file'],
    requiresApproval: ['github_create_issue'], // human approval before creating issues
  })
  console.log('Connected:', github.id, '— status:', github.status)
  console.log('Tools discovered:', github.discoveredTools.map(t => t.name))

  // Connect a second server with per-user credentials
  const slack = await theazo.mcp.connect({
    name: 'slack',
    transport: 'streamable-http',
    url: 'https://mcp-slack.example.com/mcp',
    credentialsType: 'per_user', // each user provides their own Slack token
  })
  console.log('Slack connected:', slack.id)

  // ── Per-User Credentials ────────────────────────────────────
  // For per_user mode, set credentials per user

  await theazo.mcp.setUserCredentials(slack.id, 'user_123', {
    headers: { 'Authorization': 'Bearer xoxb-user-123-token' },
  })
  console.log('Set credentials for user_123 on Slack MCP')

  // ── Manage Connections ──────────────────────────────────────

  // List all connections
  const connections = await theazo.mcp.list()
  console.log('\nAll MCP connections:')
  for (const conn of connections) {
    console.log(`  [${conn.transport}] ${conn.name} — ${conn.status} — ${conn.toolCount} tools`)
  }

  // Get connection details
  const detail = await theazo.mcp.get(github.id)
  console.log('GitHub detail:', {
    status: detail.status,
    toolCount: detail.toolCount,
    lastHealthCheck: detail.lastHealthCheck,
  })

  // List tools on a connection
  const tools = await theazo.mcp.tools(github.id)
  console.log('\nGitHub tools:')
  for (const tool of tools) {
    console.log(`  ${tool.name} — ${tool.description}`)
  }

  // ── Health and Refresh ──────────────────────────────────────

  const health = await theazo.mcp.health(github.id)
  console.log('\nHealth:', {
    status: health.status,
    latency: `${health.latencyMs}ms`,
    lastPing: health.lastPingAt,
  })

  // Refresh tool list (if server added new tools)
  const refreshed = await theazo.mcp.refresh(github.id)
  console.log('Refreshed tools:', refreshed.map(t => t.name))

  // Update connection settings
  await theazo.mcp.update(github.id, {
    toolFilter: null, // remove filter — expose all tools
    requiresApproval: [], // no approval needed
  })

  // ── Expose Your Own Tools as MCP ────────────────────────────
  // Let external clients (Claude Desktop, etc.) use your agents as tools

  await theazo.mcp.serverConfig({
    expose: ['web_search', 'code_review', 'data_analysis'],
    auth: 'api_key',
  })
  const serverConfig = await theazo.mcp.getServerConfig()
  console.log('\nMCP server URL:', serverConfig.url)
  console.log('Exposed tools:', serverConfig.expose)
  // → Clients connect to https://mcp.theazo.com/v1 with your API key

  // ── Use MCP Tools in Agent Runs ─────────────────────────────
  // Agents automatically use connected MCP tools

  const session = await theazo.sessions.forUser('mcp_user')
  const result = await session.run('developer', 'Find open bugs in our repo and summarize them')
  console.log('\nAgent output:', result.output)
  console.log('Tool calls:', result.toolCalls?.map(tc => tc.tool))
  // → The agent called github_search_repos and github_list_issues automatically

  // ── Cleanup ─────────────────────────────────────────────────

  await theazo.mcp.deleteUserCredentials(slack.id, 'user_123')
  await theazo.mcp.disconnect(github.id)
  await theazo.mcp.disconnect(slack.id)
  console.log('Disconnected all MCP servers')

  await session.terminate()
}

main().catch(console.error)
