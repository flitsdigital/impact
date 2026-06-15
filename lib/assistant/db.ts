// Datalaag voor de AI-assistent. Draait via de service-role admin-client
// (omzeilt RLS) omdat een Telegram→n8n→route-call geen ingelogde sessie heeft.
// De handelende gebruiker wordt expliciet meegegeven (author_id / audit).
import { createAdminClient } from '@/lib/supabase/admin'
import { rankMatches } from './match'

type DB = ReturnType<typeof createAdminClient>

function db(): DB {
  return createAdminClient()
}

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p
  if (error) throw new Error(error.message)
  return data as T
}

// ─── Identiteit / audit ─────────────────────────────────────────────────────

export async function findProfileIdByTelegram(telegramUserId: string): Promise<string | null> {
  const data = await unwrap(
    db().from('assistant_identities').select('profile_id').eq('telegram_user_id', telegramUserId).maybeSingle(),
  )
  return (data as { profile_id: string } | null)?.profile_id ?? null
}

export async function getProfileName(profileId: string): Promise<string | null> {
  const data = await unwrap(
    db().from('profiles').select('full_name').eq('id', profileId).maybeSingle(),
  )
  return (data as { full_name: string | null } | null)?.full_name ?? null
}

// Recente beurten voor gespreksgeheugen: zelfde gebruiker, binnen het tijdvenster,
// max N, chronologisch (oudste eerst). Foutbeurten worden overgeslagen zodat ze de
// context niet vervuilen.
export async function getRecentHistory(
  profileId: string,
  opts: { withinMinutes?: number; limit?: number } = {},
): Promise<{ input_text: string; reply_text: string }[]> {
  const { withinMinutes = 15, limit = 5 } = opts
  const sinceIso = new Date(Date.now() - withinMinutes * 60_000).toISOString()
  const data = await unwrap(
    db()
      .from('assistant_log')
      .select('input_text, reply_text')
      .eq('profile_id', profileId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(limit),
  )
  return (data as { input_text: string; reply_text: string | null }[])
    .reverse()
    .filter((r): r is { input_text: string; reply_text: string } =>
      !!r.reply_text && !r.reply_text.startsWith('ERROR:') && !r.reply_text.startsWith('Er ging iets mis'))
}

export async function logInteraction(input: {
  profileId: string | null
  inputText: string
  replyText: string | null
  toolCalls: { name: string; input: unknown }[]
}): Promise<void> {
  await db().from('assistant_log').insert({
    profile_id:  input.profileId,
    input_text:  input.inputText,
    reply_text:  input.replyText,
    tool_calls:  input.toolCalls,
  })
}

// ─── Leads ──────────────────────────────────────────────────────────────────

export async function searchLeads(query: string) {
  const rows = await unwrap(
    db().from('leads').select('id, bedrijfsnaam, contactpersoon, status').limit(200),
  )
  return rankMatches(query, rows as any[], (l) => `${l.bedrijfsnaam} ${l.contactpersoon ?? ''}`)
}

export async function addContactmoment(input: {
  profileId: string
  leadId: string
  type: string
  datum: string
  notitie: string | null
}) {
  return unwrap(
    db().from('lead_contactmomenten').insert({
      lead_id:   input.leadId,
      author_id: input.profileId,
      type:      input.type,
      datum:     input.datum,
      notitie:   input.notitie,
    }).select('id').single(),
  )
}

export async function setLeadStatus(leadId: string, status: string) {
  return unwrap(db().from('leads').update({ status }).eq('id', leadId).select('id').single())
}

export async function createLead(input: {
  bedrijfsnaam: string
  contactpersoon?: string | null
  email?: string | null
  telefoon?: string | null
  notities?: string | null
}) {
  return unwrap(
    db().from('leads').insert({
      bedrijfsnaam: input.bedrijfsnaam,
      contactpersoon: input.contactpersoon ?? null,
      email: input.email ?? null,
      telefoon: input.telefoon ?? null,
      notities: input.notities ?? null,
      bron: 'overig',
      status: 'nieuw',
    }).select('id').single(),
  )
}

// ─── Klanten ────────────────────────────────────────────────────────────────

export async function searchKlanten(query: string) {
  const rows = await unwrap(
    db().from('klanten').select('id, naam, status, notities').limit(200),
  )
  return rankMatches(query, rows as any[], (k) => k.naam)
}

export async function appendKlantNote(klantId: string, text: string, dateStr: string) {
  const klant = await unwrap(
    db().from('klanten').select('notities').eq('id', klantId).single(),
  ) as { notities: string | null }
  const prefix = `[${dateStr}] `
  const notities = klant.notities ? `${klant.notities}\n${prefix}${text}` : `${prefix}${text}`
  return unwrap(db().from('klanten').update({ notities }).eq('id', klantId).select('id').single())
}

// ─── Content / posts ──────────────────────────────────────────────────────────

export async function searchPosts(query: string) {
  const rows = await unwrap(
    db().from('posts').select('id, caption, status, type, scheduled_at, klanten(naam)').limit(200),
  )
  return rankMatches(
    query,
    rows as any[],
    (p) => `${p.klanten?.naam ?? ''} ${p.caption ?? ''}`,
  )
}

export async function createPost(input: {
  klantId: string | null
  type: string
  caption: string | null
  scheduledAt: string | null
}) {
  return unwrap(
    db().from('posts').insert({
      klant_id:     input.klantId,
      type:         input.type,
      caption:      input.caption,
      scheduled_at: input.scheduledAt,
      status:       'te_doen',
      media_urls:   [],
    }).select('id').single(),
  )
}

export async function setPostStatus(input: { profileId: string; postId: string; status: string }) {
  const prev = await unwrap(
    db().from('posts').select('status').eq('id', input.postId).single(),
  ) as { status: string }
  const res = await unwrap(
    db().from('posts').update({ status: input.status }).eq('id', input.postId).select('id').single(),
  )
  await db().from('post_logs').insert({
    post_id:     input.postId,
    user_id:     input.profileId,
    action:      'status_changed',
    from_status: prev.status,
    to_status:   input.status,
  })
  return res
}

export async function reschedulePost(input: { profileId: string; postId: string; datum: string }) {
  const res = await unwrap(
    db().from('posts').update({ scheduled_at: input.datum }).eq('id', input.postId).select('id').single(),
  )
  await db().from('post_logs').insert({ post_id: input.postId, user_id: input.profileId, action: 'rescheduled' })
  return res
}

// ─── Projecten ────────────────────────────────────────────────────────────────

export async function searchProjects(query: string) {
  const rows = await unwrap(
    db().from('projects').select('id, naam, status, klanten(naam)').limit(200),
  )
  return rankMatches(query, rows as any[], (p) => `${p.naam} ${p.klanten?.naam ?? ''}`)
}

export async function createTask(input: {
  projectId: string
  titel: string
  beschrijving: string | null
  deadline: string | null
  prioriteit: string | null
}) {
  return unwrap(
    db().from('tasks').insert({
      project_id:   input.projectId,
      titel:        input.titel,
      beschrijving: input.beschrijving,
      deadline:     input.deadline,
      prioriteit:   input.prioriteit,
      status:       'todo',
    }).select('id').single(),
  )
}

export async function setTaskStatus(taskId: string, status: string) {
  return unwrap(db().from('tasks').update({ status }).eq('id', taskId).select('id').single())
}
