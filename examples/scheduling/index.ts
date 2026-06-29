/**
 * Theazo — Scheduling Example
 *
 * Set up a cron schedule and a webhook trigger.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  // Schedule an agent to run every day at 9am UTC
  const schedule = await theazo.schedules.create({
    name: 'daily-report',
    cron: '0 9 * * *',
    agent: 'daily_reporter',
    userId: 'schedule_user',
    input: { type: 'daily_summary' },
  })
  console.log('Schedule:', schedule.id, '— status:', schedule.status)

  // Create a webhook trigger — external systems POST here to run an agent
  const trigger = await theazo.triggers.create({
    name: 'payment-webhook',
    agent: 'payment_classifier',
    userId: 'trigger_user',
    type: 'webhook',
  })
  console.log('Trigger URL:', trigger.url)
  console.log('Trigger secret:', trigger.secret)
  console.log('Use this cURL to test:')
  console.log(`  curl -X POST ${trigger.url} -H "X-Trigger-Signature: <hmac>" -d '{"event":"payment"}'`)
}

main().catch(console.error)
