/**
 * Theazo — Full App Example
 *
 * A minimal HTTP server showing how Theazo lives inside a real backend.
 * No framework dependencies — just Node's built-in http module.
 *
 * This is what your backend looks like when you integrate Theazo:
 *   1. Create a session per authenticated user
 *   2. Run agents on their behalf
 *   3. Stream responses to your frontend
 *   4. Track costs per user
 *   5. Handle errors gracefully
 *
 * Usage:
 *   export THEAZO_API_KEY=th_live_...
 *   npx tsx server.ts
 *
 * Then:
 *   curl http://localhost:3000/api/sessions -X POST -d '{"userId":"user_123"}'
 *   curl http://localhost:3000/api/run -X POST -d '{"sessionId":"ses_...","task":"analyze competitor pricing"}'
 *   curl http://localhost:3000/api/stream -X POST -d '{"sessionId":"ses_...","message":"Write a haiku about AI"}'
 *   curl http://localhost:3000/api/usage/user_123
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Theazo, TheazoError } from 'theazo'

// ─── Init ─────────────────────────────────────────────────────────

const theazo = new Theazo({ apiKey: process.env.THEAZO_API_KEY! })

// ─── Helpers ──────────────────────────────────────────────────────

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString()
  return raw ? JSON.parse(raw) : {}
}

function json(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function error(res: ServerResponse, err: unknown) {
  if (err instanceof TheazoError) {
    json(res, { error: err.code, message: err.message, requestId: err.requestId }, err.status)
  } else {
    json(res, { error: 'internal', message: String(err) }, 500)
  }
}

// ─── Routes ───────────────────────────────────────────────────────

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = req.url ?? '/'
  const method = req.method ?? 'GET'

  try {
    // POST /api/sessions — Create or get session for a user
    if (method === 'POST' && url === '/api/sessions') {
      const body = await readBody(req)
      const userId = body.userId as string
      if (!userId) return json(res, { error: 'userId required' }, 400)

      // forUser is idempotent — creates if new, returns existing if active
      const session = await theazo.sessions.forUser(userId, {
        limits: { maxCost: { amount: 1000, currency: 'usd', period: 'day' } },
      })

      return json(res, {
        sessionId: session.id,
        userId: session.userId,
        status: session.status,
      })
    }

    // POST /api/run — Run an agent task (non-streaming)
    if (method === 'POST' && url === '/api/run') {
      const body = await readBody(req)
      const sessionId = body.sessionId as string
      const task = body.task as string
      if (!sessionId || !task) return json(res, { error: 'sessionId and task required' }, 400)

      const session = await theazo.sessions.get(sessionId)
      const result = await session.run('assistant', task)

      return json(res, {
        output: result.output,
        cost: result.cost,
        duration: result.duration,
        toolCalls: result.toolCalls,
      })
    }

    // POST /api/stream — Stream a chat response (SSE)
    if (method === 'POST' && url === '/api/stream') {
      const body = await readBody(req)
      const sessionId = body.sessionId as string
      const message = body.message as string
      if (!sessionId || !message) return json(res, { error: 'sessionId and message required' }, 400)

      const session = await theazo.sessions.get(sessionId)
      const conv = await session.chat.create({ agent: 'assistant' })

      // SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })

      for await (const event of session.chat.stream(conv.id, { content: message })) {
        res.write(`data: ${JSON.stringify(event)}\n\n`)
      }

      res.write('data: [DONE]\n\n')
      return res.end()
    }

    // GET /api/usage/:userId — Get usage for a user
    if (method === 'GET' && url.startsWith('/api/usage/')) {
      const userId = url.split('/api/usage/')[1]
      if (!userId) return json(res, { error: 'userId required' }, 400)

      const usage = await theazo.usage.forUser(userId, { period: 'month' })

      return json(res, {
        userId,
        totalCost: usage.total,
        compute: usage.compute,
        models: usage.models,
        breakdown: usage.breakdown,
      })
    }

    // GET /api/health
    if (method === 'GET' && url === '/api/health') {
      return json(res, { status: 'ok' })
    }

    // 404
    json(res, { error: 'not_found', message: `${method} ${url} not found` }, 404)

  } catch (err) {
    error(res, err)
  }
}

// ─── Start ────────────────────────────────────────────────────────

const port = parseInt(process.env.PORT ?? '3000', 10)
const server = createServer(handleRequest)

server.listen(port, () => {
  console.log(`Theazo full-app example running on http://localhost:${port}`)
  console.log('')
  console.log('Routes:')
  console.log('  POST /api/sessions   — Create session for a user')
  console.log('  POST /api/run        — Run an agent task')
  console.log('  POST /api/stream     — Stream a chat response (SSE)')
  console.log('  GET  /api/usage/:id  — Get usage for a user')
  console.log('  GET  /api/health     — Health check')
})
