import { runAssistant } from '@/lib/assistant/run'
import { findProfileIdByTelegram, getProfileName, logInteraction } from '@/lib/assistant/db'

// POST /api/assistant — aangeroepen door n8n (Telegram-transport), server-to-server.
// Body: { telegram_user_id: string|number, text: string }
// Beveiliging: gedeeld geheim in header x-assistant-secret + allowlist via
// assistant_identities. Antwoordt altijd 200 met { reply } zodat n8n de tekst
// kan terugsturen naar Telegram (ook bij nette weigeringen).
export async function POST(req: Request) {
  const secret = process.env.ASSISTANT_WEBHOOK_SECRET
  if (!secret || req.headers.get('x-assistant-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: { telegram_user_id?: string | number; text?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ reply: 'Ongeldig verzoek.' }, { status: 400 })
  }

  const telegramUserId = body.telegram_user_id != null ? String(body.telegram_user_id) : ''
  const text = (body.text ?? '').trim()
  if (!telegramUserId || !text) {
    return Response.json({ reply: 'Geen tekst ontvangen.' })
  }

  const profileId = await findProfileIdByTelegram(telegramUserId)
  if (!profileId) {
    return Response.json({
      reply: 'Je bent nog niet gekoppeld aan een Flits-account. Vraag de beheerder om je toe te voegen.',
    })
  }

  const profileName = (await getProfileName(profileId)) ?? 'een teamlid'
  const today = new Date().toISOString().slice(0, 10)

  try {
    const { reply, toolCalls } = await runAssistant({ text, profileId, profileName, today })
    await logInteraction({ profileId, inputText: text, replyText: reply, toolCalls })
    return Response.json({ reply })
  } catch (e) {
    const message = (e as Error).message
    await logInteraction({ profileId, inputText: text, replyText: `ERROR: ${message}`, toolCalls: [] })
    return Response.json({ reply: 'Er ging iets mis bij het verwerken. Probeer het opnieuw.' })
  }
}
