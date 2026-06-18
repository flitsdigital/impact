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

// ─── Persoonlijke taken (todolijst, niet project-gebonden) ───────────────────
// Eigenaar = de handelende gebruiker (profileId). De acties zijn op user_id
// gescoped zodat de assistent alleen eigen todo's kan af-/wegwerken.

export async function createTodo(input: {
  profileId: string
  titel: string
  deadline: string | null
  prioriteit: string | null
}) {
  return unwrap(
    db().from('todos').insert({
      user_id:    input.profileId,
      titel:      input.titel,
      deadline:   input.deadline ?? today(), // standaard vandaag, tenzij meegegeven
      prioriteit: input.prioriteit ?? 'normaal',
    }).select('id').single(),
  )
}

export async function listTodos(profileId: string, includeDone: boolean) {
  let q = db().from('todos')
    .select('id, titel, done, deadline, prioriteit')
    .eq('user_id', profileId)
  if (!includeDone) q = q.eq('done', false)
  return unwrap(q.order('created_at', { ascending: false }))
}

export async function completeTodo(profileId: string, todoId: string) {
  return unwrap(
    db().from('todos')
      .update({ done: true, updated_at: new Date().toISOString() })
      .eq('id', todoId).eq('user_id', profileId)
      .select('id').single(),
  )
}

export async function deleteTodoById(profileId: string, todoId: string) {
  return unwrap(
    db().from('todos').delete().eq('id', todoId).eq('user_id', profileId).select('id').single(),
  )
}

// ─── Datum-helpers ──────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function weekRange(): { start: string; end: string } {
  const t = today()
  const dow = (new Date(t + 'T00:00:00Z').getUTCDay() + 6) % 7 // ma=0
  const start = addDays(t, -dow)
  return { start, end: addDays(start, 6) }
}

// ─── A. Inzicht / vraag-tools (alleen-lezen) ────────────────────────────────

export async function findStaleLeads(days: number) {
  const leads = (await unwrap(
    db().from('leads').select('id, bedrijfsnaam, status').in('status', ['nieuw', 'contact', 'offerte']),
  )) as { id: string; bedrijfsnaam: string; status: string }[]
  const cms = (await unwrap(
    db().from('lead_contactmomenten').select('lead_id, datum'),
  )) as { lead_id: string; datum: string }[]

  const last = new Map<string, string>()
  for (const c of cms) {
    const prev = last.get(c.lead_id)
    if (!prev || c.datum > prev) last.set(c.lead_id, c.datum)
  }
  const cutoff = addDays(today(), -days)
  return leads
    .map((l) => ({ bedrijfsnaam: l.bedrijfsnaam, status: l.status, laatste_contact: last.get(l.id) ?? null }))
    .filter((l) => l.laatste_contact === null || l.laatste_contact < cutoff)
}

export async function getAgenda(period: 'vandaag' | 'deze_week') {
  const range = period === 'vandaag' ? { start: today(), end: today() } : weekRange()
  const posts = await unwrap(
    db().from('posts').select('caption, type, status, scheduled_at, klanten(naam)')
      .gte('scheduled_at', range.start).lte('scheduled_at', range.end).order('scheduled_at'),
  )
  const taken = await unwrap(
    db().from('tasks').select('titel, status, deadline, projects(naam)')
      .neq('status', 'klaar').gte('deadline', range.start).lte('deadline', range.end).order('deadline'),
  )
  return { periode: period, posts, taken }
}

export async function getPipelineValue() {
  const rows = (await unwrap(
    db().from('leads').select('status, waarde').in('status', ['nieuw', 'contact', 'offerte']),
  )) as { status: string; waarde: number | null }[]
  const perStatus: Record<string, number> = {}
  let totaal = 0
  for (const r of rows) {
    const w = Number(r.waarde ?? 0)
    perStatus[r.status] = (perStatus[r.status] ?? 0) + w
    totaal += w
  }
  return { per_status: perStatus, totaal }
}

export async function getOpenTasks(onlyOverdue: boolean) {
  let q = db().from('tasks').select('titel, status, deadline, projects(naam)').neq('status', 'klaar')
  if (onlyOverdue) q = q.lt('deadline', today())
  return unwrap(q.order('deadline'))
}

export async function getOpenInvoices() {
  const rows = (await unwrap(
    db().from('klant_facturen').select('label, amount, status, due_date, klanten(naam)')
      .in('status', ['planned', 'sent', 'overdue']).order('due_date'),
  )) as { amount: number | null }[]
  const totaal_open = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0)
  return { facturen: rows, totaal_open }
}

// ─── B. CRUD afmaken ────────────────────────────────────────────────────────

export async function createKlant(input: {
  naam: string
  type?: string | null
  contactpersoon?: string | null
  email?: string | null
  telefoon?: string | null
}) {
  return unwrap(
    db().from('klanten').insert({
      naam: input.naam,
      type: input.type ?? 'one-off',
      contactpersoon: input.contactpersoon ?? null,
      email: input.email ?? null,
      telefoon: input.telefoon ?? null,
      status: 'actief',
    }).select('id').single(),
  )
}

// Bouwt een update-object met alleen de meegegeven velden.
function defined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>
}

export async function updateKlant(klantId: string, fields: {
  status?: string; contactpersoon?: string; email?: string; telefoon?: string; volgende_factuur?: string
}) {
  return unwrap(db().from('klanten').update(defined(fields)).eq('id', klantId).select('id').single())
}

export async function updateLead(leadId: string, fields: {
  waarde?: number; contactpersoon?: string; email?: string; telefoon?: string
}) {
  return unwrap(db().from('leads').update(defined(fields)).eq('id', leadId).select('id').single())
}

export async function createProject(input: { naam: string; klantId?: string | null; deadline?: string | null }) {
  return unwrap(
    db().from('projects').insert({
      naam: input.naam,
      klant_id: input.klantId ?? null,
      deadline: input.deadline ?? null,
      status: 'gepland',
    }).select('id').single(),
  )
}

export async function setProjectStatus(projectId: string, status: string) {
  return unwrap(db().from('projects').update({ status }).eq('id', projectId).select('id').single())
}

export async function updateTask(taskId: string, fields: { deadline?: string; prioriteit?: string }) {
  return unwrap(db().from('tasks').update(defined(fields)).eq('id', taskId).select('id').single())
}

export async function addTaskComment(input: { profileId: string; taskId: string; inhoud: string }) {
  return unwrap(
    db().from('task_comments').insert({ task_id: input.taskId, author_id: input.profileId, inhoud: input.inhoud })
      .select('id').single(),
  )
}

// ─── C. Team / toewijzen ────────────────────────────────────────────────────

export async function searchTeam(query: string) {
  const rows = await unwrap(db().from('profiles').select('id, full_name, email').limit(200))
  return rankMatches(query, rows as any[], (p) => `${p.full_name ?? ''} ${p.email ?? ''}`)
}

export async function assignTask(taskId: string, profileId: string) {
  return unwrap(
    db().from('task_assignees').upsert({ task_id: taskId, profile_id: profileId }, { onConflict: 'task_id,profile_id' })
      .select('task_id').single(),
  )
}

export async function assignPost(postId: string, profileId: string) {
  return unwrap(
    db().from('post_assignees').upsert({ post_id: postId, user_id: profileId }, { onConflict: 'post_id,user_id' })
      .select('post_id').single(),
  )
}

// ─── E. Dagelijkse briefing ─────────────────────────────────────────────────

export async function buildBriefing(): Promise<string> {
  const stale = await findStaleLeads(7)
  const feedback = (await unwrap(
    db().from('posts').select('caption, klanten(naam)').eq('status', 'klaar_voor_feedback'),
  )) as { caption: string | null; klanten?: { naam?: string } | null }[]
  const overdue = (await unwrap(
    db().from('tasks').select('titel, deadline, projects(naam)').neq('status', 'klaar').lt('deadline', today()),
  )) as { titel: string; deadline: string; projects?: { naam?: string } | null }[]

  const lines: string[] = [`☀️ Goedemorgen! Stand van zaken (${today()}):`, '']
  lines.push(`📞 Leads >7 dagen geen contact: ${stale.length}`)
  for (const l of stale.slice(0, 8)) lines.push(`  • ${l.bedrijfsnaam} (${l.status}, laatst: ${l.laatste_contact ?? 'nooit'})`)
  lines.push('', `🖼️ Posts wachten op feedback: ${feedback.length}`)
  for (const p of feedback.slice(0, 8)) lines.push(`  • ${p.klanten?.naam ?? 'Geen klant'}: ${(p.caption ?? '').slice(0, 40) || '(geen caption)'}`)
  lines.push('', `⏰ Taken over deadline: ${overdue.length}`)
  for (const t of overdue.slice(0, 8)) lines.push(`  • ${t.titel} (${t.projects?.naam ?? '—'}, ${t.deadline})`)
  return lines.join('\n')
}
