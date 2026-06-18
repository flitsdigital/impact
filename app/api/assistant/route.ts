import { runAssistant } from '@/lib/assistant/run'
import { findProfileIdByTelegram, getProfileName, logInteraction } from '@/lib/assistant/db'

// POST /api/assistant — server-to-server (n8n/Telegram of iOS Shortcuts).
// Body: { text: string } + identiteit:
//   - profile_id: string   → direct het profiel-uuid (bv. iOS Shortcuts), óf
//   - telegram_user_id      → opgezocht via assistant_identities (n8n/Telegram)
// Beveiliging: gedeeld geheim in header x-assistant-secret (de caller is dus al
// vertrouwd; een meegegeven profile_id wordt geaccepteerd). Antwoordt altijd 200
// met { reply } zodat n8n de tekst kan terugsturen (ook bij nette weigeringen).
export async function POST(req: Request) {
  const secret = process.env.ASSISTANT_WEBHOOK_SECRET
  if (!secret || req.headers.get('x-assistant-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: { telegram_user_id?: string | number; profile_id?: string; text?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ reply: 'Ongeldig verzoek.' }, { status: 400 })
  }

  const text = (body.text ?? '').trim()
  if (!text) {
    return Response.json({ reply: 'Geen tekst ontvangen.' })
  }

  // Identiteit: directe profile_id (Shortcuts) heeft voorrang; anders Telegram-koppeling.
  let profileId: string | null = null
  if (body.profile_id) {
    profileId = String(body.profile_id)
  } else if (body.telegram_user_id != null) {
    profileId = await findProfileIdByTelegram(String(body.telegram_user_id))
  }
  if (!profileId) {
    return Response.json({
      reply: 'Geen gebruiker herkend. Stuur een profile_id mee, of koppel je Telegram-account.',
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
