'use server'

import { createClient, requireAuth } from '@/lib/supabase/server'
import { z } from 'zod/v4'
import type { TodoWithAssignees, TeamMember } from '@/types/todo'

const SELECT =
  '*, assignees:todo_assignees ( profile_id, profiles ( id, full_name, avatar_url ) )'

const createSchema = z.object({
  titel:      z.string().min(1, 'Titel is verplicht'),
  notitie:    z.string().optional().nullable(),
  deadline:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ongeldige datum').optional().nullable(),
  prioriteit: z.enum(['urgent', 'hoog', 'normaal', 'laag']).default('normaal'),
  assignees:  z.array(z.string().uuid()).default([]),
})

const patchSchema = z.object({
  titel:      z.string().min(1).optional(),
  notitie:    z.string().nullable().optional(),
  deadline:   z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')]).nullable().optional(),
  prioriteit: z.enum(['urgent', 'hoog', 'normaal', 'laag']).optional(),
})

export async function getTeam(): Promise<TeamMember[]> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return [] }
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .order('full_name', { ascending: true })
  return (data ?? []) as TeamMember[]
}

export async function getTodos(): Promise<TodoWithAssignees[]> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return [] }
  // RLS filtert al op owner-of-assignee.
  const { data } = await supabase
    .from('todos')
    .select(SELECT)
    .order('created_at', { ascending: false })
  return (data ?? []) as TodoWithAssignees[]
}

export async function createTodo(
  input: { titel: string; notitie?: string | null; deadline?: string | null; prioriteit?: string; assignees?: string[] },
): Promise<{ error?: string; todo?: TodoWithAssignees }> {
  const supabase = await createClient()
  let user
  try { user = await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Validatiefout' }
  const { assignees, ...todo } = parsed.data

  const { data: row, error } = await supabase
    .from('todos')
    .insert({ ...todo, deadline: todo.deadline || null, user_id: user.id })
    .select('id')
    .single()
  if (error) return { error: error.message }

  if (assignees.length > 0) {
    const { error: aErr } = await supabase
      .from('todo_assignees')
      .insert(assignees.map((profile_id) => ({ todo_id: row.id, profile_id })))
    if (aErr) {
      await supabase.from('todos').delete().eq('id', row.id) // rol de wees-todo terug
      return { error: aErr.message }
    }
  }

  const { data: full, error: fErr } = await supabase.from('todos').select(SELECT).eq('id', row.id).single()
  if (fErr) return { error: fErr.message }
  return { todo: full as TodoWithAssignees }
}

export async function toggleDone(id: string, done: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  const { error } = await supabase
    .from('todos')
    .update({ done, updated_at: new Date().toISOString() })
    .eq('id', id)
  return error ? { error: error.message } : {}
}

export async function updateTodo(
  id: string,
  updates: { titel?: string; notitie?: string | null; deadline?: string | null; prioriteit?: string },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const parsed = patchSchema.safeParse(updates)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Validatiefout' }

  const patch: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }
  if ('deadline' in patch) patch.deadline = patch.deadline || null

  const { error } = await supabase.from('todos').update(patch).eq('id', id)
  return error ? { error: error.message } : {}
}

export async function setAssignees(id: string, profileIds: string[]): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  // Valideer als UUIDs — dit is ook de enige plek met een handgebouwde filterstring.
  const parsed = z.array(z.string().uuid()).safeParse(profileIds)
  if (!parsed.success) return { error: 'Ongeldige toewijzing' }
  const ids = parsed.data

  if (ids.length === 0) {
    const { error } = await supabase.from('todo_assignees').delete().eq('todo_id', id)
    return error ? { error: error.message } : {}
  }

  // Upsert de nieuwe set (PK = todo_id+profile_id, dus dubbele zijn no-ops)…
  const { error: insErr } = await supabase
    .from('todo_assignees')
    .upsert(ids.map((profile_id) => ({ todo_id: id, profile_id })), { onConflict: 'todo_id,profile_id' })
  if (insErr) return { error: insErr.message }

  // …en verwijder wie er niet meer bij hoort. Pas ná de geslaagde insert, zodat
  // een mislukte insert nooit stilletjes alle toewijzingen wist.
  const { error: delErr } = await supabase
    .from('todo_assignees')
    .delete()
    .eq('todo_id', id)
    .not('profile_id', 'in', `(${ids.join(',')})`)
  return delErr ? { error: delErr.message } : {}
}

export async function deleteTodo(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  const { error } = await supabase.from('todos').delete().eq('id', id)
  return error ? { error: error.message } : {}
}
