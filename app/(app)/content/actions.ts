'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod/v4'
import type { PostStatus } from '@/types/post'

function parseAssigneeIds(raw: FormDataEntryValue | null): string[] {
  if (!raw || typeof raw !== 'string') return []
  try { return JSON.parse(raw) as string[] } catch { return [] }
}

const postSchema = z.object({
  klant_id:     z.string().uuid().nullable().optional(),
  status:       z.enum(['te_doen', 'bezig', 'klaar_voor_feedback', 'akkoord', 'gepost']).default('te_doen'),
  type:         z.enum(['foto', 'video', 'reel', 'carousel']).default('foto'),
  caption:      z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  media_url:    z.string().nullable().optional(),
})

// ─── Create post ─────────────────────────────────────────────────────────────

async function requireAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd.')
  return user
}

export async function createPost(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean; id?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  // Handle optional media upload
  let media_url: string | null = null
  const mediaFile = formData.get('media') as File | null
  if (mediaFile && mediaFile.size > 0) {
    const ext = mediaFile.name.split('.').pop() ?? 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('post-media')
      .upload(path, mediaFile)
    if (uploadError) return { error: uploadError.message }
    const { data: { publicUrl } } = supabase.storage
      .from('post-media')
      .getPublicUrl(path)
    media_url = publicUrl
  }

  const rawKlantId = formData.get('klant_id') as string | null
  const raw = {
    klant_id:     (rawKlantId && rawKlantId !== '__none__') ? rawKlantId : null,
    status:       formData.get('status') || 'te_doen',
    type:         formData.get('type') || 'foto',
    caption:      formData.get('caption') || null,
    scheduled_at: formData.get('scheduled_at') || null,
    media_url,
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

// ─── Update post (metadata only) ─────────────────────────────────────────────

export async function updatePost(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  const id = formData.get('id') as string
  if (!id) return { error: 'Geen ID opgegeven' }

  // Handle optional new media upload (or explicit clear)
  let media_url: string | null | undefined = undefined
  const mediaFile  = formData.get('media') as File | null
  const clearMedia = formData.get('clear_media') === '1'
  if (mediaFile && mediaFile.size > 0) {
    const ext = mediaFile.name.split('.').pop() ?? 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('post-media')
      .upload(path, mediaFile)
    if (uploadError) return { error: uploadError.message }
    const { data: { publicUrl } } = supabase.storage
      .from('post-media')
      .getPublicUrl(path)
    media_url = publicUrl
  } else if (clearMedia) {
    media_url = null
  }

  const rawKlantId2 = formData.get('klant_id') as string | null
  const raw = {
    klant_id:     (rawKlantId2 && rawKlantId2 !== '__none__') ? rawKlantId2 : null,
    status:       formData.get('status') || 'te_doen',
    type:         formData.get('type') || 'foto',
    caption:      formData.get('caption') || null,
    scheduled_at: formData.get('scheduled_at') || null,
    ...(media_url !== undefined && { media_url }),
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

// ─── Delete post ──────────────────────────────────────────────────────────────

export async function deletePost(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/content')
  return {}
}
