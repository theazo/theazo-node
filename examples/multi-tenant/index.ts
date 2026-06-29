/**
 * Theazo — Multi-Tenant (B2B2C) Example
 *
 * The core Theazo pattern: you build an AI product,
 * your customers use it, Theazo handles per-user isolation.
 *
 * This example shows what a real backend looks like:
 *   1. Onboard a new customer (session + limits + knowledge)
 *   2. Run agents on their behalf (isolated compute)
 *   3. Track per-user costs in real-time
 *   4. Enforce per-user budget limits
 *   5. Export usage for billing (Stripe integration)
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {

  // ══════════════════════════════════════════════════════════════
  // Step 1: Onboard customers with different plans
  // ══════════════════════════════════════════════════════════════

  // Free tier customer — low limits
  const freeUser = await theazo.sessions.forUser('customer_free_123', {
    limits: {
      maxCost: { amount: 100, currency: 'usd', period: 'day' },   // $1/day
      maxAgents: 1,
      maxComputeMinutes: 10,
    },
    metadata: { plan: 'free', company: 'SmallStartup Inc' },
  })
  console.log('Free user session:', freeUser.id)

  // Pro tier customer — higher limits
  const proUser = await theazo.sessions.forUser('customer_pro_456', {
    limits: {
      maxCost: { amount: 5000, currency: 'usd', period: 'day' },  // $50/day
      maxAgents: 10,
      maxComputeMinutes: 120,
    },
    metadata: { plan: 'pro', company: 'GrowthCo' },
  })
  console.log('Pro user session:', proUser.id)

  // Enterprise customer — custom limits
  const entUser = await theazo.sessions.forUser('customer_ent_789', {
    limits: {
      maxCost: { amount: 50000, currency: 'usd', period: 'day' }, // $500/day
      maxAgents: 50,
      maxComputeMinutes: 1440, // 24 hours
    },
    metadata: { plan: 'enterprise', company: 'BigCorp', sso: 'okta' },
  })
  console.log('Enterprise user session:', entUser.id)

  // ══════════════════════════════════════════════════════════════
  // Step 2: Each customer's data is isolated
  // ══════════════════════════════════════════════════════════════

  // Upload knowledge for Pro customer only — Free can't see it
  await proUser.knowledge.upload({
    collection: 'company-docs',
    files: [{
      filename: 'playbook.md',
      content: Buffer.from('GrowthCo sales playbook: Focus on mid-market SaaS companies...'),
    }],
  })
  console.log('Pro user knowledge uploaded')

  // Enterprise customer gets their own isolated knowledge
  await entUser.knowledge.upload({
    collection: 'compliance-docs',
    files: [{
      filename: 'policies.md',
      content: Buffer.from('BigCorp compliance: All outputs must be reviewed before external sharing...'),
    }],
  })

  // ══════════════════════════════════════════════════════════════
  // Step 3: Run agents — each user's cost is tracked separately
  // ══════════════════════════════════════════════════════════════

  // Free user runs a simple task
  const freeResult = await freeUser.run('assistant', 'Summarize this in one sentence: AI is transforming business.')
  console.log('\nFree user result:', freeResult.output)
  console.log('Free user cost:', freeResult.cost) // { amount: 1, currency: 'usd' }

  // Pro user runs a more complex task
  const proResult = await proUser.run('researcher', 'Analyze competitor pricing strategies in the CRM market')
  console.log('\nPro user result:', proResult.output.substring(0, 100) + '...')
  console.log('Pro user cost:', proResult.cost)

  // Enterprise user runs a fleet
  const fleet = await entUser.fleets.dispatch({
    agent: 'analyst',
    inputs: [
      { report: 'Q1 Financials' },
      { report: 'Q2 Financials' },
      { report: 'Q3 Financials' },
      { report: 'Q4 Financials' },
    ],
    concurrency: 4,
  })
  console.log('\nEnterprise fleet dispatched:', fleet.id, '— items:', fleet.totalItems)

  // ══════════════════════════════════════════════════════════════
  // Step 4: Check per-user costs and limits in real-time
  // ══════════════════════════════════════════════════════════════

  console.log('\n── Per-User Usage ──')

  // Check each user's usage
  for (const userId of ['customer_free_123', 'customer_pro_456', 'customer_ent_789']) {
    const usage = await theazo.usage.forUser(userId, { period: 'today' })
    console.log(`${userId}:`)
    console.log(`  Total: $${(usage.total.amount / 100).toFixed(2)}`)
    console.log(`  Compute: ${usage.compute.minutes} min ($${(usage.compute.cost.amount / 100).toFixed(2)})`)
    console.log(`  Models: ${usage.models.calls} calls, ${usage.models.tokens.input + usage.models.tokens.output} tokens`)
  }

  // Check if a user is near their limit
  const freeLimits = await freeUser.limits()
  console.log('\nFree user limits:')
  if (freeLimits.maxCost) {
    console.log(`  Cost: ${freeLimits.maxCost.percentage}% used ($${(freeLimits.maxCost.used / 100).toFixed(2)} of $${(freeLimits.maxCost.limit / 100).toFixed(2)})`)
  }
  if (freeLimits.maxAgents) {
    console.log(`  Agents: ${freeLimits.maxAgents.used}/${freeLimits.maxAgents.limit}`)
  }

  // ══════════════════════════════════════════════════════════════
  // Step 5: Adjust limits on the fly (plan upgrade)
  // ══════════════════════════════════════════════════════════════

  // Customer upgrades from Free to Pro
  await freeUser.updateLimits({
    maxCost: { amount: 5000, currency: 'usd', period: 'day' },
    maxAgents: 10,
    maxComputeMinutes: 120,
  })
  console.log('\nFree user upgraded to Pro limits')

  // ══════════════════════════════════════════════════════════════
  // Step 6: Platform-wide billing and export
  // ══════════════════════════════════════════════════════════════

  // Overall platform usage
  const summary = await theazo.usage.summary({ period: 'today' })
  console.log('\n── Platform Summary ──')
  console.log('Total cost today:', summary.totalCost)
  console.log('Active sessions:', summary.activeSessions)
  console.log('Running agents:', summary.runningAgents)
  console.log('Top user:', summary.topUser)

  // Daily breakdown for invoicing
  const daily = await theazo.usage.daily({ period: 'last_30_days' })
  console.log('\nDaily costs (last 30 days):')
  for (const day of daily.slice(0, 5)) {
    console.log(`  ${day.date}: $${(day.cost.amount / 100).toFixed(2)} — ${day.modelCalls} calls — ${day.computeMinutes} min`)
  }

  // Cost by provider (for BYOI customers)
  const byProvider = await theazo.usage.byProvider({ period: 'month' })
  console.log('\nCost by provider:', byProvider)

  // Export for Stripe billing integration
  const exported = await theazo.usage.export({ period: 'month', format: 'stripe' })
  console.log('\nStripe export ready:', typeof exported)
  // → Send to Stripe Usage Records API for metered billing

  // ══════════════════════════════════════════════════════════════
  // Step 7: Set platform-wide budget alerts
  // ══════════════════════════════════════════════════════════════

  await theazo.billing.setBudget({
    monthly: { amount: 100000, currency: 'usd' }, // $1000/month
    alerts: [
      { threshold: 0.5, channel: 'webhook', action: 'pause_user' },  // 50%: pause heavy users
      { threshold: 0.8, channel: 'webhook' },                         // 80%: warning
      { threshold: 1.0, channel: 'webhook', action: 'pause_all' },   // 100%: pause everything
    ],
  })

  const budget = await theazo.billing.getBudget()
  console.log('\nBudget:', {
    budget: `$${(budget.budget.amount / 100).toFixed(2)}`,
    spent: `$${(budget.spent.amount / 100).toFixed(2)}`,
    remaining: `$${(budget.remaining.amount / 100).toFixed(2)}`,
    percentage: `${budget.percentage}%`,
  })

  // Per-user budget (limit individual customers)
  await theazo.billing.setUserBudget({
    monthly: { amount: 10000, currency: 'usd' }, // $100/user/month default
  })

  // ══════════════════════════════════════════════════════════════
  // Step 8: List and manage all sessions
  // ══════════════════════════════════════════════════════════════

  const sessions = await theazo.sessions.list({ status: 'active', limit: 50 })
  console.log('\nActive sessions:', sessions.data.length)
  for (const s of sessions.data) {
    console.log(`  [${s.id}] user: ${s.userId} — plan: ${s.metadata.plan ?? 'unknown'}`)
  }

  // Clean up
  await freeUser.terminate()
  await proUser.terminate()
  await entUser.terminate()
  console.log('\nAll sessions terminated')
}

main().catch(console.error)
