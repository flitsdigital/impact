'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Task, TaskStatus, TaskPriority } from '@/types/project'

// ─── Projects ─────────────────────────────────────────────────────────────────

async function requireAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd.')
  return user
}

export async function createProject(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      naam:         formData.get('naam') as string,
      beschrijving: (formData.get('beschrijving') as string) || null,
      klant_id:     (formData.get('klant_id') as string) || null,
      kleur:        (formData.get('kleur') as string) || '#5B5BD6',
      deadline:     (formData.get('deadline') as string) || null,
      budget:       formData.get('budget') ? Number(formData.get('budget')) : null,
      status:       (formData.get('status') as string) || 'bezig',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/projecten')
  return { id: data.id }
}

export async function updateProject(
  projectId: string,
  updates: {
    naam?: string
    beschrijving?: string | null
    status?: string
    prioriteit?: string
    kleur?: string
    start_date?: string | null
    deadline?: string | null
    budget?: number | null
    klant_id?: string | null
  },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) return { error: error.message }

  revalidatePath('/projecten')
  return {}
}

export async function moveProject(
  projectId: string,
  newStatus: string,
): Promise<{ error?: string }> {
  return updateProject(projectId, { status: newStatus })
}

export async function toggleFavorite(projectId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  let user
  try { user = await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { data: existing } = await supabase
    .from('project_favorites')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    const { error } = await supabase.from('project_favorites').delete()
      .eq('project_id', projectId)
      .eq('user_id', user.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('project_favorites').insert({
      project_id: projectId,
      user_id: user.id,
    })
    if (error) return { error: error.message }
  }

  revalidatePath('/projecten')
  return {}
}

export async function setProjectAssignees(
  projectId: string,
  profileIds: string[],
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { error: deleteError } = await supabase.from('project_assignees').delete().eq('project_id', projectId)
  if (deleteError) return { error: deleteError.message }

  if (profileIds.length === 0) return {}

  const { error } = await supabase.from('project_assignees').insert(
    profileIds.map((id) => ({ project_id: projectId, profile_id: id })),
  )

  if (error) return { error: error.message }

  revalidatePath('/projecten')
  return {}
}

export async function deleteProject(projectId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  if (error) return { error: error.message }
  revalidatePath('/projecten')
  return {}
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function createTask(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; id?: string; task?: Task }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id:    formData.get('project_id') as string,
      parent_id:     (formData.get('parent_id') as string) || null,
      titel:         formData.get('titel') as string,
      beschrijving:  (formData.get('beschrijving') as string) || null,
      status:        (formData.get('status') as TaskStatus) || 'todo',
      prioriteit:    (formData.get('prioriteit') as TaskPriority) || 'normaal',
      deadline:      (formData.get('deadline') as string) || null,
      schatting_uren: formData.get('schatting_uren') ? Number(formData.get('schatting_uren')) : null,
    })
    .select('*')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/projecten')
  revalidatePath('/taken')
  return { id: data.id, task: data as Task }
}

export async function updateTask(
  taskId: string,
  updates: {
    titel?: string
    beschrijving?: string | null
    status?: TaskStatus
    prioriteit?: TaskPriority
    deadline?: string | null
    schatting_uren?: number | null
    sprint_id?: string | null
    milestone_id?: string | null
    volgorde?: number
  },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath('/projecten')
  revalidatePath('/taken')
  return {}
}

export async function moveTask(
  taskId: string,
  newStatus: TaskStatus,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  return updateTask(taskId, { status: newStatus })
}

export async function deleteTask(taskId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) return { error: error.message }
  revalidatePath('/projecten')
  revalidatePath('/taken')
  return {}
}

// ─── Task assignees ───────────────────────────────────────────────────────────

export async function setTaskAssignees(
  taskId: string,
  profileIds: string[],
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  // Delete all existing assignees
  const { error: deleteError } = await supabase.from('task_assignees').delete().eq('task_id', taskId)
  if (deleteError) return { error: deleteError.message }

  if (profileIds.length === 0) return {}

  const { error } = await supabase.from('task_assignees').insert(
    profileIds.map((id) => ({ task_id: taskId, profile_id: id })),
  )

  if (error) return { error: error.message }

  revalidatePath('/projecten')
  revalidatePath('/taken')
  return {}
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function addComment(
  taskId: string,
  inhoud: string,
): Promise<{ error?: string; id?: string }> {
  if (!inhoud.trim()) return { error: 'Reactie mag niet leeg zijn.' }
  const supabase = await createClient()
  let user
  try { user = await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { data, error } = await supabase
    .from('task_comments')
    .insert({ task_id: taskId, author_id: user.id, inhoud })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/projecten')
  return { id: data.id }
}

export async function deleteComment(commentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  const { error } = await supabase.from('task_comments').delete().eq('id', commentId)
  if (error) return { error: error.message }
  revalidatePath('/projecten')
  return {}
}

// ─── Project documents ────────────────────────────────────────────────────────

export async function addProjectDocument(
  projectId: string,
  type: 'link' | 'file',
  naam: string,
  url: string,
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { data, error } = await supabase
    .from('project_documents')
    .insert({ project_id: projectId, type, naam, url })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/projecten')
  return { id: data.id }
}

export async function deleteProjectDocument(documentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { data: doc } = await supabase
    .from('project_documents')
    .select('type, url')
    .eq('id', documentId)
    .single()

  if (doc?.type === 'file') {
    // New rows store the bare storage path; legacy rows store the full public URL.
    const path = doc.url.includes('/project-docs/')
      ? doc.url.split('/project-docs/')[1]
      : doc.url
    if (path) {
      await supabase.storage.from('project-docs').remove([path])
    }
  }

  const { error } = await supabase.from('project_documents').delete().eq('id', documentId)
  if (error) return { error: error.message }

  revalidatePath('/projecten')
  return {}
}

export async function uploadProjectFile(
  projectId: string,
  formData: FormData,
): Promise<{ error?: string; url?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const file = formData.get('file')
  if (!(file instanceof File)) return { error: 'Geen bestand ontvangen.' }

  const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20 MB — matches the UI limit
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'Bestand is groter dan 20 MB.' }

  // Keep letters/digits/dot/dash/underscore; collapse the rest to '-'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^[-.]+/, '').slice(0, 100)
  const path = `${projectId}/${Date.now()}-${safeName || 'bestand'}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('project-docs')
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  return { url: path }
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export async function createLabel(
  projectId: string,
  naam: string,
  kleur: string,
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { data, error } = await supabase
    .from('project_labels')
    .insert({ project_id: projectId, naam, kleur })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/projecten')
  return { id: data.id }
}
