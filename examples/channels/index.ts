/**
 * Theazo — Chat Widget (Channels) Example
 *
 * Create a chat embed channel. Your users talk to an agent
 * via a widget on your website — no auth needed on their side.
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx index.ts
 */

import { Theazo } from 'theazo'

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

async function main() {
  // Create a chat widget channel linked to your support agent
  const channel = await theazo.channels.chatEmbed({
    agent: 'support_agent',
    theme: {
      primaryColor: '#6366f1',
      position: 'bottom-right',
      title: 'Help',
      placeholder: 'Ask anything...',
    },
  })

  console.log('Channel:', channel.id)

  // Your frontend sends messages to the public endpoint (no API key needed):
  //   POST https://api.theazo.com/channels/{channel.id}/messages
  //   Body: { "text": "How do I reset my password?", "visitorId": "vis_abc" }
  //
  // Stream responses via SSE:
  //   GET https://api.theazo.com/channels/{channel.id}/stream?visitorId=vis_abc
}

main().catch(console.error)
