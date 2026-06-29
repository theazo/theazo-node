/**
 * Theazo — Teams (Multi-Agent Collaboration) Example
 *
 * Teams let multiple agents work together on a task.
 * Three coordination modes:
 *
 *   sequential    — agents run one after another, each sees prior output
 *   collaborative — agents discuss and build on each other's work
 *   hierarchical  — lead agent delegates to specialists
 *
 * Use cases: code review pipelines, research with critique,
 * content creation with editing, complex analysis with validation.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  const session = await theazo.sessions.forUser('team_user')

  // ── Sequential Team ─────────────────────────────────────────
  // Agents run in order. Each sees the output of the previous one.
  // Pattern: Research → Critique → Write

  const researchTeam = await session.teams.create({
    name: 'research-report',
    agents: [
      {
        role: 'researcher',
        agent: 'researcher',
        instructions: 'Find key facts and data points about the topic. Be thorough.',
      },
      {
        role: 'critic',
        agent: 'analyst',
        instructions: 'Evaluate the research. Flag gaps, weak claims, and missing data.',
      },
      {
        role: 'writer',
        agent: 'writer',
        instructions: 'Write a clear, well-structured report incorporating the research and addressing the critique.',
      },
    ],
    coordination: 'sequential',
    sharedContext: true, // each agent sees all prior outputs
    maxRounds: 1,
  })

  console.log('Team:', researchTeam.id, '—', researchTeam.name)

  const result = await researchTeam.run('Analyze the AI agent infrastructure market in 2026')

  console.log('\n── Sequential Team Result ──')
  console.log('Final output:', result.output.substring(0, 200) + '...')
  console.log('Cost:', result.cost)
  console.log('Duration:', result.duration)
  console.log('\nPer-agent outputs:')
  for (const [role, output] of Object.entries(result.agentOutputs)) {
    console.log(`  [${role}]: ${output.substring(0, 100)}...`)
  }

  // ── Collaborative Team ──────────────────────────────────────
  // Agents discuss and refine together. Good for brainstorming,
  // consensus-building, or multi-perspective analysis.

  const analysisTeam = await session.teams.create({
    name: 'market-analysis',
    agents: [
      {
        role: 'bull',
        agent: 'analyst',
        instructions: 'You are bullish. Argue why this company will succeed. Cite evidence.',
      },
      {
        role: 'bear',
        agent: 'analyst',
        instructions: 'You are bearish. Argue the risks and why it might fail. Cite evidence.',
      },
      {
        role: 'synthesizer',
        agent: 'writer',
        instructions: 'Synthesize both perspectives into a balanced investment thesis.',
      },
    ],
    coordination: 'collaborative',
    sharedContext: true,
    maxRounds: 2, // 2 rounds of discussion before final synthesis
  })

  const analysis = await analysisTeam.run('Should we invest in Anthropic at a $60B valuation?')

  console.log('\n── Collaborative Team Result ──')
  console.log('Final output:', analysis.output.substring(0, 200) + '...')
  console.log('Rounds completed, cost:', analysis.cost)

  // ── Hierarchical Team ───────────────────────────────────────
  // Lead agent decides what to delegate and to whom.
  // Good for complex tasks where the plan isn't known upfront.

  const incidentTeam = await session.teams.create({
    name: 'incident-response',
    agents: [
      {
        role: 'commander',
        agent: 'analyst',
        instructions: 'You lead incident response. Analyze the situation and delegate tasks to specialists. Compile the final incident report.',
      },
      {
        role: 'log-analyst',
        agent: 'researcher',
        instructions: 'Analyze log data. Find error patterns, stack traces, and timing correlations.',
      },
      {
        role: 'infra-specialist',
        agent: 'researcher',
        instructions: 'Check infrastructure health. Look at CPU, memory, network, and deployment history.',
      },
      {
        role: 'comms',
        agent: 'writer',
        instructions: 'Draft customer communication and internal status updates based on findings.',
      },
    ],
    coordination: 'hierarchical', // commander delegates to others
    sharedContext: true,
    maxRounds: 1,
  })

  const incident = await incidentTeam.run('Production API returning 500 errors for 15% of requests since 2:30 PM UTC')

  console.log('\n── Hierarchical Team Result ──')
  console.log('Incident report:', incident.output.substring(0, 200) + '...')
  console.log('Agents used:', Object.keys(incident.agentOutputs))
  console.log('Total cost:', incident.cost)

  // ── Cancel a Running Team ───────────────────────────────────

  // const longTeam = await session.teams.create({ ... })
  // const runPromise = longTeam.run('Very complex task')
  // await new Promise(r => setTimeout(r, 5000))
  // await longTeam.cancel() // stops all agents immediately

  await session.terminate()
}

main().catch(console.error)
