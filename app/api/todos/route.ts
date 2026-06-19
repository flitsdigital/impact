import { z } from 'zod/v4'
import { createAdminClient } from '@/lib/supabase/admin'
import { sortTodos } from '@/lib/todos'
import { TODO_SELECT, apiAuthorized } from '@/lib/todos-api'
import type { TodoWithAssignees } from '@/types/todo'

// Server-to-server todo-API. Beveiliging: header `x-api-secret` (zie .env.example).
// Gebruikt de service-role admin-client (RLS omzeild), dus eigenaar/toegewezenen
// moeten expliciet in de request staan als profiel-uuid's.

const createSchema = z.object({
  user_id:    z.string().uuid('user_id moet een uuid zijn'),
  titel:      z.string().min(1, 'Titel is verplicht'),
  notitie:    z.string().optional().nullable(),
  deadline:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet YYYY-MM-DD zijn').optional().nullable(),
  prioriteit: z.enum(['urgent', 'hoog', 'normaal', 'laag']).default('normaal'),
  assignees:  z.array(z.string().guid()).default([]),
})

// GET /api/todos?user_id=<uuid>&done=<true|false>
// Zonder user_id: alle taken. Met user_id: taken waar die persoon eigenaar óf
// toegewezene is.
export async function GET(req: Request) {
  if (!apiAuthorized(req)) return new Response('Unauthorized', { status: 401 })

  const url = new URL(req.url)
  const userId = url.searchParams.get('user_id')
  const done = url.searchParams.get('done')

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('todos')
    .select(TODO_SELECT)
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  let rows = (data ?? []) as TodoWithAssignees[]
  if (userId) {
    rows = rows.filter((t) => t.user_id === userId || t.assignees.some((a) => a.profile_id === userId))
  }
  if (done === 'true' || done === 'false') {
    rows = rows.filter((t) => t.done === (done === 'true'))
  }

  return Response.json({ todos: sortTodos(rows) })
}

// POST /api/todos  body: { user_id, titel, notitie?, deadline?, prioriteit?, assignees? }
export async function POST(req: Request) {
  if (!apiAuthorized(req)) return new Response('Unauthorized', { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return Response.json({ error: 'Ongeldige JSON' }, { status: 400 }) }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Validatiefout' }, { status: 400 })
  const { assignees, ...todo } = parsed.data

  // Defaults voor API-todo's: deadline = vandaag (tenzij meegegeven), prioriteit =
  // normaal (via het zod-schema). Zo verschijnen ingeschoten taken meteen op vandaag.
  const vandaag = new Date().toISOString().slice(0, 10)

  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from('todos')
    .insert({ ...todo, deadline: todo.deadline || vandaag })
    .select('id')
    .single()
  if (error) return Response.json({ error: error.message }, { status: 400 })

  if (assignees.length > 0) {
    const { error: aErr } = await admin
      .from('todo_assignees')
      .insert(assignees.map((profile_id) => ({ todo_id: row.id, profile_id })))
    if (aErr) {
      await admin.from('todos').delete().eq('id', row.id) // rol de wees-todo terug
      return Response.json({ error: aErr.message }, { status: 400 })
    }
  }

  const { data: full, error: fErr } = await admin.from('todos').select(TODO_SELECT).eq('id', row.id).single()
  if (fErr) return Response.json({ error: fErr.message }, { status: 500 })
  return Response.json({ todo: full }, { status: 201 })
}
