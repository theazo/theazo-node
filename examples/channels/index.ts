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
  console.log('Widget endpoints:')
  console.log('  Send:', channel.endpoints.send)
  console.log('  History:', channel.endpoints.history)
  console.log('  Stream:', channel.endpoints.stream)

  // Your frontend calls these endpoints directly (no API key needed)
  // POST /channels/:id/messages { text: "...", visitorId: "..." }
}

main().catch(console.error)
