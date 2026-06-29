/**
 * Theazo — Channels Example
 *
 * Deploy agents to customer-facing channels:
 *   - Chat embed (website widget)
 *   - Slack bot
 *   - Email inbox
 *   - Phone (voice)
 *
 * Each channel auto-creates sessions per visitor and routes
 * messages to your agent definition. No backend code needed.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  // ── Chat Embed (Website Widget) ─────────────────────────────
  // Drop a <script> tag on your site — instant AI support

  const chatWidget = await theazo.channels.chatEmbed({
    agent: 'support_agent',
    theme: {
      primaryColor: '#6366f1',
      position: 'bottom-right',
      title: 'Ask Us Anything',
      placeholder: 'Type your question...',
    },
  })
  console.log('Chat widget:', chatWidget.id)
  console.log('Script tag:', chatWidget.scriptTag)
  // → <script src="https://cdn.theazo.com/chat/ch_abc.js"></script>

  // ── Slack Bot ───────────────────────────────────────────────
  // Agent responds in Slack channels automatically

  const slackBot = await theazo.channels.slack({
    agent: 'slack_assistant',
    workspace: 'T01234ABCDE',
    channels: ['#support', '#engineering'],
    botName: 'Theazo Bot',
  })
  console.log('Slack bot:', slackBot.id)

  // ── Email Inbox ─────────────────────────────────────────────
  // Forward emails to an agent — it replies automatically

  const emailChannel = await theazo.channels.email({
    agent: 'email_responder',
    address: 'support@acme.com',
  })
  console.log('Email channel:', emailChannel.id)

  // ── Phone (Voice) ───────────────────────────────────────────
  // Voice agent answers phone calls

  const phoneChannel = await theazo.channels.phone({
    agent: 'phone_agent',
    phoneNumber: '+1-555-0100',
    voice: 'alloy',
  })
  console.log('Phone channel:', phoneChannel.id)

  // ── Manage Channels ─────────────────────────────────────────

  // List all channels
  const channels = await theazo.channels.list()
  console.log('\nAll channels:')
  for (const ch of channels) {
    console.log(`  [${ch.type}] ${ch.id} — enabled: ${ch.enabled} — conversations: ${ch.conversationCount}`)
  }

  // Update config
  await theazo.channels.update(chatWidget.id, {
    config: { theme: { primaryColor: '#10b981' } },
  })

  // Disable/enable
  await theazo.channels.disable(chatWidget.id)
  console.log('Widget disabled')

  await theazo.channels.enable(chatWidget.id)
  console.log('Widget re-enabled')

  // View conversations on a channel
  const conversations = await theazo.channels.conversations(chatWidget.id)
  console.log('Widget conversations:', conversations.length)

  // Test channel connectivity
  const test = await theazo.channels.test(slackBot.id)
  console.log('Slack test:', test.ok ? 'connected' : test.message)

  // Clean up
  await theazo.channels.delete(chatWidget.id)
  await theazo.channels.delete(slackBot.id)
  await theazo.channels.delete(emailChannel.id)
  await theazo.channels.delete(phoneChannel.id)
  console.log('All channels deleted')
}

main().catch(console.error)
