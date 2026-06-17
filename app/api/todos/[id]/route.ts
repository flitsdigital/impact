import { z } from 'zod/v4'
import { createAdminClient } from '@/lib/supabase/admin'
import { TODO_SELECT, apiAuthorized } from '@/lib/todos-api'

// PATCH/DELETE op één todo. Beveiliging: header `x-api-secret`. Service-role.

const patchSchema = z.object({
  titel:      z.string().min(1).optional(),
  notitie:    z.string().nullable().optional(),
  deadline:   z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')]).nullable().optional(),
  prioriteit: z.enum(['urgent', 'hoog', 'normaal', 'laag']).optional(),
  done:       z.boolean().optional(),
  assignees:  z.array(z.string().uuid()).optional(),
})

// PATCH /api/todos/[id]  body: elk veld optioneel; `assignees` vervangt de set.
export async function PATCH(req: Request, ctx: RouteContext<'/api/todos/[id]'>) {
  if (!apiAuthorized(req)) return new Response('Unauthorized', { status: 401 })
  const { id } = await ctx.params

  let body: unknown
  try { body = await req.json() } catch { return Response.json({ error: 'Ongeldige JSON' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Validatiefout' }, { status: 400 })
  const { assignees, ...fields } = parsed.data

  const admin = createAdminClient()

  if (Object.keys(fields).length > 0) {
    const patch: Record<string, unknown> = { ...fields, updated_at: new Date().toISOString() }
    if ('deadline' in patch) patch.deadline = patch.deadline || null
    const { error } = await admin.from('todos').update(patch).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 400 })
  }

  if (assignees) {
    const { error: delErr } = await admin.from('todo_assignees').delete().eq('todo_id', id)
    if (delErr) return Response.json({ error: delErr.message }, { status: 400 })
    if (assignees.length > 0) {
      const { error: insErr } = await admin
        .from('todo_assignees')
        .insert(assignees.map((profile_id) => ({ todo_id: id, profile_id })))
      if (insErr) return Response.json({ error: insErr.message }, { status: 400 })
    }
  }

  const { data: full, error } = await admin.from('todos').select(TODO_SELECT).eq('id', id).single()
  if (error || !full) return Response.json({ error: 'Taak niet gevonden' }, { status: 404 })
  return Response.json({ todo: full })
}

// DELETE /api/todos/[id]
export async function DELETE(req: Request, ctx: RouteContext<'/api/todos/[id]'>) {
  if (!apiAuthorized(req)) return new Response('Unauthorized', { status: 401 })
  const { id } = await ctx.params

  const admin = createAdminClient()
  const { error } = await admin.from('todos').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ ok: true })
}
