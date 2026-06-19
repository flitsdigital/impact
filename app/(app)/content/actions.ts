'use server'

import { revalidatePath } from 'next/cache'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { z } from 'zod/v4'
import type { PostStatus } from '@/types/post'

function parseAssigneeIds(raw: FormDataEntryValue | null): string[] {
  if (!raw || typeof raw !== 'string') return []
  try { return JSON.parse(raw) as string[] } catch { return [] }
}

// media_order is een geordend manifest: per slot een bestaande URL (string) of
// null voor "hier komt een nieuw geüpload bestand". De nieuwe bestanden zitten
// in de 'media'-velden, in dezelfde volgorde als de null-slots. Zo blijft de
// exacte (versleepbare) volgorde behouden, ook als oud en nieuw door elkaar staan.
function parseMediaOrder(raw: FormDataEntryValue | null): (string | null)[] {
  if (!raw || typeof raw !== 'string') return []
  try { return JSON.parse(raw) as (string | null)[] } catch { return [] }
}

// Bouwt de geordende media_urls op volgens het manifest.
// Gooit een Error met .message bij upload-fouten.
async function resolveMediaUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
): Promise<string[]> {
  const order = parseMediaOrder(formData.get('media_order'))
  const files = formData.getAll('media').filter((f): f is File => f instanceof File && f.size > 0)

  const uploaded: string[] = []
  for (const file of files) {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('post-media').upload(path, file)
    if (error) throw new Error(error.message)
    const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path)
    uploaded.push(publicUrl)
  }

  let fileIdx = 0
  const result: string[] = []
  for (const slot of order) {
    if (slot === null) { if (fileIdx < uploaded.length) result.push(uploaded[fileIdx++]) }
    else result.push(slot)
  }
  // Veiligheidsnet: eventuele extra uploads zonder slot achteraan toevoegen.
  while (fileIdx < uploaded.length) result.push(uploaded[fileIdx++])
  return result
}

const postSchema = z.object({
  // .guid() (loose 8-4-4-4-12), niet .uuid(): Postgres' uuid-type accepteert élke
  // hex in dat formaat, ook geïmporteerde ids met een niet-RFC version/variant-nibble.
  // zod v4's .uuid() is strikter dan de DB en weigerde anders bestaande klant-ids.
  klant_id:     z.string().guid().nullable().optional(),
  status:       z.enum(['te_doen', 'bezig', 'klaar_voor_feedback', 'akkoord', 'gepost']).default('te_doen'),
  type:         z.enum(['foto', 'video', 'reel', 'carousel']).default('foto'),
  caption:      z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  media_urls:   z.array(z.string()).default([]),
})

// ─── Create post ─────────────────────────────────────────────────────────────

export async function createPost(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean; id?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  let media_urls: string[]
  try { media_urls = await resolveMediaUrls(supabase, formData) }
  catch (e) { return { error: (e as Error).message } }

  const rawKlantId = formData.get('klant_id') as string | null
  const raw = {
    klant_id:     (rawKlantId && rawKlantId !== '__none__') ? rawKlantId : null,
    status:       formData.get('status') || 'te_doen',
    type:         formData.get('type') || 'foto',
    caption:      formData.get('caption') || null,
    scheduled_at: formData.get('scheduled_at') || null,
    media_urls,
  }

  const parsed = postSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Validatiefout' }

  const { data, error } = await supabase
    .from('posts')
    .insert(parsed.data)
    .select('id')
    .single()
  if (error) return { error: error.message }

  // Assignees
  const assigneeIds = parseAssigneeIds(formData.get('assignee_ids'))
  if (assigneeIds.length > 0) {
    const { error: insertAssigneesError } = await supabase.from('post_assignees').insert(
      assigneeIds.map((uid) => ({ post_id: data.id, user_id: uid }))
    )
    if (insertAssigneesError) return { error: insertAssigneesError.message }
  }

  // Audit log
  await supabase.from('post_logs').insert({
    post_id:   data.id,
    action:    'created',
    to_status: parsed.data.status,
  })

  revalidatePath('/content')
  return { success: true, id: data.id }
}

// ─── Bulk plannen (kalender-schilder) ─────────────────────────────────────────
// Maakt in één keer lege drafts (status te_doen) aan voor één klant: per
// geschilderde dag één post met zijn type. Caption/media vul je later in.

const bulkScheduleSchema = z.object({
  klant_id: z.string().guid(),
  slots: z
    .array(z.object({ date: z.string(), type: z.enum(['foto', 'video']) }))
    .min(1),
})

export async function bulkSchedulePosts(input: {
  klant_id: string
  slots: { date: string; type: 'foto' | 'video' }[]
}): Promise<{ error?: string; count?: number }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const parsed = bulkScheduleSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Validatiefout' }

  const rows = parsed.data.slots.map((s) => ({
    klant_id:     parsed.data.klant_id,
    status:       'te_doen' as const,
    type:         s.type,
    scheduled_at: s.date,
    media_urls:   [] as string[],
  }))

  const { data, error } = await supabase.from('posts').insert(rows).select('id')
  if (error) return { error: error.message }

  if (data?.length) {
    await supabase.from('post_logs').insert(
      data.map((d) => ({ post_id: d.id, action: 'created', to_status: 'te_doen' })),
    )
  }

  revalidatePath('/content')
  return { count: data?.length ?? 0 }
}

// ─── Update post (metadata only) ─────────────────────────────────────────────

export async function updatePost(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  const id = formData.get('id') as string
  if (!id) return { error: 'Geen ID opgegeven' }

  let media_urls: string[]
  try { media_urls = await resolveMediaUrls(supabase, formData) }
  catch (e) { return { error: (e as Error).message } }

  const rawKlantId2 = formData.get('klant_id') as string | null
  const raw = {
    klant_id:     (rawKlantId2 && rawKlantId2 !== '__none__') ? rawKlantId2 : null,
    status:       formData.get('status') || 'te_doen',
    type:         formData.get('type') || 'foto',
    caption:      formData.get('caption') || null,
    scheduled_at: formData.get('scheduled_at') || null,
    media_urls,
  }

  const parsed = postSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Validatiefout' }

  const { error } = await supabase.from('posts').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  // Replace assignees atomically
  const { error: deleteAssigneesError } = await supabase.from('post_assignees').delete().eq('post_id', id)
  if (deleteAssigneesError) return { error: deleteAssigneesError.message }
  const assigneeIds = parseAssigneeIds(formData.get('assignee_ids'))
  if (assigneeIds.length > 0) {
    const { error: insertAssigneesError } = await supabase.from('post_assignees').insert(
      assigneeIds.map((uid) => ({ post_id: id, user_id: uid }))
    )
    if (insertAssigneesError) return { error: insertAssigneesError.message }
  }

  await supabase.from('post_logs').insert({ post_id: id, action: 'updated' })

  revalidatePath('/content')
  return { success: true }
}

// ─── Update status ────────────────────────────────────────────────────────────

export async function updatePostStatus(
  id: string,
  newStatus: PostStatus,
  fromStatus: PostStatus
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { error } = await supabase
    .from('posts')
    .update({ status: newStatus })
    .eq('id', id)
  if (error) return { error: error.message }

  await supabase.from('post_logs').insert({
    post_id:     id,
    action:      'status_changed',
    from_status: fromStatus,
    to_status:   newStatus,
  })

  revalidatePath('/content')
  return {}
}

// ─── Update scheduled date ────────────────────────────────────────────────────

export async function updatePostDate(
  id: string,
  scheduledAt: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  const { error } = await supabase
    .from('posts')
    .update({ scheduled_at: scheduledAt })
    .eq('id', id)
  if (error) return { error: error.message }

  await supabase.from('post_logs').insert({ post_id: id, action: 'rescheduled' })

  revalidatePath('/content')
  return {}
}

// ─── Herorden post binnen/naar een dag ─────────────────────────────────────────
// `orderedIds` is de gewenste volgorde van álle posts op `toDate` (incl. de
// versleepte post). We hernummeren die dag met integer-posities (0,1,2,…) en
// zetten meteen de datum van de versleepte post. Een dag heeft maar een handvol
// posts, dus de paar losse updates zijn verwaarloosbaar.
export async function reorderPostInDay(
  movedId: string,
  toDate: string,
  orderedIds: string[],
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const results = await Promise.all(
    orderedIds.map((id, i) =>
      supabase
        .from('posts')
        .update(id === movedId ? { position: i, scheduled_at: toDate } : { position: i })
        .eq('id', id),
    ),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) return { error: failed.error.message }

  await supabase.from('post_logs').insert({ post_id: movedId, action: 'rescheduled' })

  revalidatePath('/content')
  return {}
}

// ─── Delete post ──────────────────────────────────────────────────────────────

export async function deletePost(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/content')
  return {}
}
