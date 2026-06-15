import { buildBriefing } from '@/lib/assistant/db'

// GET /api/assistant/briefing — dagelijkse samenvatting (stale leads, posts op
// feedback, taken over deadline). Aangeroepen door n8n (cron) → Telegram.
// Zelfde gedeelde-geheim-auth als /api/assistant; valt onder de middleware-uitzondering.
export async function GET(req: Request) {
  const secret = process.env.ASSISTANT_WEBHOOK_SECRET
  if (!secret || req.headers.get('x-assistant-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }
  try {
    return Response.json({ text: await buildBriefing() })
  } catch (e) {
    return Response.json({ text: `Briefing mislukt: ${(e as Error).message}` })
  }
}
