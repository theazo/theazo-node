/**
 * Theazo — Agent Definitions Example
 *
 * Save reusable agent configs — model, prompt, tools — and version them.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  // Create a reusable agent definition
  const def = await theazo.agents.define({
    name: 'researcher',
    compute: 'python',
    model: 'anthropic/claude-sonnet',
    instructions: 'You are a research agent. Use web search to find data, then write a summary.',
    tools: ['web_search', 'write_file'],
  })
  console.log('Definition:', def.id, '— version:', def.version)

  // Use it to run an agent — config loaded automatically
  const session = await theazo.sessions.forUser('def_user')
  const result = await session.run(def.id, 'research the AI agent market')
  console.log('Output:', result.output)

  // Update the definition — creates a new version
  await theazo.agents.updateDefinition(def.id, {
    instructions: 'You are a senior research agent. Be thorough and cite sources.',
    changelog: 'Added citation requirement',
  })

  // List versions
  const versions = await theazo.agents.versions(def.id)
  console.log('Versions:', versions.length) // 2
}

main().catch(console.error)
