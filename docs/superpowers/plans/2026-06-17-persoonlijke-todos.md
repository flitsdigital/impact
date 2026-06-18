# Persoonlijke todo's — Implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een persoonlijke todo-lijst (datum/prioriteit/teamleden) die overal in de CRM via een globale drawer bereikbaar is.

**Architecture:** Eigen `todos`-tabel + `todo_assignees` met owner+assignee-RLS. Een zustand-store (`store/taken.ts`) houdt de lijst + drawer-state vast en doet optimistische updates; server actions in `app/(app)/_actions/todos.ts` praten met Supabase (géén `revalidatePath` — de lijst leeft client-side). De drawer wordt één keer in `app/(app)/layout.tsx` gemount en is via een topbar-knop + sneltoets `⌘⇧T` overal te openen.

**Tech Stack:** Next.js (App Router, server actions), Supabase (Postgres + RLS), zustand, base-ui/radix overlays, Tailwind op design-tokens, vitest (alleen voor pure helpers), Claude Preview voor UI-verificatie.

**Conventies die dit plan volgt:**
- Server actions spiegelen `app/(app)/leads/actions.ts`: `'use server'`, `createClient`, `requireAuth(supabase)` (geeft de auth-user; `user.id === profiles.id`), zod-validatie, retour `{ error?: ... }`.
- Geen component-tests in de codebase → **UI-taken worden geverifieerd via Claude Preview + `npm run typecheck` + `npm run lint`**, niet via vitest. Alleen pure logica (`lib/todos.ts`) krijgt een vitest-test.
- Nieuw gedeeld component ⇒ DemoBlock op `/design-system` + rij in `docs/DESIGN-SYSTEM.md` (Taak 10).
- `profiles.id` refereert `auth.users(id)` (geverifieerd in migratie 003) → `auth.uid()` werkt direct in RLS.

---

## File Structure

| Pad | Verantwoordelijkheid | Taak |
|---|---|---|
| `supabase/migrations/016_todos.sql` | Schema `todos` + `todo_assignees` + RLS | 1 |
| `types/todo.ts` | `Todo`, `TodoWithAssignees`, `TodoAssignee`, `TeamMember` | 2 |
| `lib/todos.ts` + `lib/todos.test.ts` | `sortTodos` (pure, getest) | 3 |
| `app/(app)/_actions/todos.ts` | Server actions: get/create/toggle/update/assign/delete + `getTeam` | 4 |
| `store/taken.ts` | Zustand-store: drawer-state + todos + team + optimistische acties | 5 |
| `components/todos/DateShortcutsPicker.tsx` | D2 datum-picker | 6 |
| `components/todos/PriorityFlags.tsx` | P3 prioriteit-flags | 6 |
| `components/todos/AssigneeDropdown.tsx` | T2 teamlid-multiselect | 6 |
| `components/todos/TodoRow.tsx` | Variant-B-rij met inline pickers | 7 |
| `components/todos/TakenDrawer.tsx` | Drawer: kop + quick-add + lijst | 8 |
| `app/(app)/layout.tsx` (mod) | Mount `TakenDrawer` | 9 |
| `components/layout/TopBar.tsx` (mod) | Trigger-knop | 9 |
| `components/design-system/DomainSection.tsx` (mod) + `docs/DESIGN-SYSTEM.md` (mod) | DemoBlocks + inventaris | 10 |
| `app/(app)/taken-prototype/**` (verwijderen) | Prototype opruimen | 11 |

---

## Task 1: Database — migratie `016_todos.sql`

**Files:**
- Create: `supabase/migrations/016_todos.sql`

- [ ] **Step 1: Schrijf de migratie**

```sql
-- ─── Persoonlijke todo's ──────────────────────────────────────────────────────
-- Vereist migraties 003 (profiles). Eigen lijst per gebruiker; een toegewezen
-- teamlid ziet de todo ook. RLS owner+assignee (strenger dan de app-conventie).

create table if not exists public.todos (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  titel       text        not null,
  notitie     text,
  done        boolean     not null default false,
  deadline    date,
  prioriteit  text        not null default 'normaal'
                          check (prioriteit in ('urgent','hoog','normaal','laag')),
  volgorde    int         not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.todo_assignees (
  todo_id     uuid not null references public.todos(id)    on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  primary key (todo_id, profile_id)
);

create index if not exists todos_user_idx          on public.todos(user_id);
create index if not exists todo_assignees_prof_idx on public.todo_assignees(profile_id);

alter table public.todos          enable row level security;
alter table public.todo_assignees enable row level security;

create policy "todos owner or assignee" on public.todos for all to authenticated
  using ( user_id = auth.uid()
          or exists (select 1 from public.todo_assignees a
                     where a.todo_id = todos.id and a.profile_id = auth.uid()) )
  with check ( user_id = auth.uid() );

create policy "todo_assignees readable" on public.todo_assignees for select to authenticated
  using ( exists (select 1 from public.todos t
                  where t.id = todo_assignees.todo_id
                        and (t.user_id = auth.uid() or todo_assignees.profile_id = auth.uid())) );

create policy "todo_assignees writable by owner" on public.todo_assignees
  for insert to authenticated
  with check ( exists (select 1 from public.todos t
                       where t.id = todo_assignees.todo_id and t.user_id = auth.uid()) );

create policy "todo_assignees deletable by owner" on public.todo_assignees
  for delete to authenticated
  using ( exists (select 1 from public.todos t
                  where t.id = todo_assignees.todo_id and t.user_id = auth.uid()) );
```

- [ ] **Step 2: Pas de migratie toe op het project**

Gebruik de Supabase MCP `apply_migration` met `name: "016_todos"` en bovenstaande SQL als `query`. (Alternatief lokaal: `supabase db push`.)

- [ ] **Step 3: Verifieer dat de tabellen bestaan**

Gebruik Supabase MCP `list_tables` (schema `public`). Verwacht: `todos` en `todo_assignees` aanwezig met de juiste kolommen. Draai daarna `get_advisors` (type `security`) en bevestig dat er geen nieuwe "RLS disabled"-waarschuwing voor deze tabellen is.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/016_todos.sql
git commit -m "feat(todos): db-schema + owner/assignee-RLS"
```

---

## Task 2: Types — `types/todo.ts`

**Files:**
- Create: `types/todo.ts`

- [ ] **Step 1: Schrijf de types**

```ts
import type { TaskPriority } from '@/types/project'

export interface Todo {
  id:         string
  user_id:    string
  titel:      string
  notitie:    string | null
  done:       boolean
  deadline:   string | null
  prioriteit: TaskPriority
  volgorde:   number
  created_at: string
  updated_at: string
}

export interface TodoAssignee {
  profile_id: string
  profiles: { id: string; full_name: string | null; avatar_url: string | null }
}

export interface TodoWithAssignees extends Todo {
  assignees: TodoAssignee[]
}

export interface TeamMember {
  id:         string
  full_name:  string | null
  avatar_url: string | null
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: geen fouten in `types/todo.ts`.

- [ ] **Step 3: Commit**

```bash
git add types/todo.ts
git commit -m "feat(todos): types"
```

---

## Task 3: Pure helper — `sortTodos` (TDD)

**Files:**
- Create: `lib/todos.ts`
- Test: `lib/todos.test.ts`

- [ ] **Step 1: Schrijf de falende test**

```ts
import { describe, it, expect } from 'vitest'
import { sortTodos } from './todos'
import type { TodoWithAssignees } from '@/types/todo'

const make = (over: Partial<TodoWithAssignees>): TodoWithAssignees => ({
  id: 'x', user_id: 'u', titel: 't', notitie: null, done: false, deadline: null,
  prioriteit: 'normaal', volgorde: 0, created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z', assignees: [], ...over,
})

describe('sortTodos', () => {
  it('zet afgevinkte todo\'s onderaan', () => {
    const out = sortTodos([make({ id: 'a', done: true }), make({ id: 'b', done: false })])
    expect(out.map((t) => t.id)).toEqual(['b', 'a'])
  })

  it('sorteert open todo\'s op volgorde, dan nieuwste eerst', () => {
    const out = sortTodos([
      make({ id: 'oud', volgorde: 0, created_at: '2026-01-01T00:00:00Z' }),
      make({ id: 'nieuw', volgorde: 0, created_at: '2026-02-01T00:00:00Z' }),
      make({ id: 'eerst', volgorde: -1, created_at: '2026-01-01T00:00:00Z' }),
    ])
    expect(out.map((t) => t.id)).toEqual(['eerst', 'nieuw', 'oud'])
  })

  it('muteert de input niet', () => {
    const input = [make({ id: 'a', done: true }), make({ id: 'b' })]
    sortTodos(input)
    expect(input.map((t) => t.id)).toEqual(['a', 'b'])
  })
})
```

- [ ] **Step 2: Draai de test, verifieer dat hij faalt**

Run: `npm test -- lib/todos.test.ts`
Expected: FAIL — `sortTodos is not a function` / module niet gevonden.

- [ ] **Step 3: Schrijf de minimale implementatie**

```ts
import type { TodoWithAssignees } from '@/types/todo'

/** Afgevinkt onderaan, dan volgorde oplopend, dan nieuwste eerst. Pure (kopieert). */
export function sortTodos(todos: TodoWithAssignees[]): TodoWithAssignees[] {
  return [...todos].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      a.volgorde - b.volgorde ||
      b.created_at.localeCompare(a.created_at),
  )
}
```

- [ ] **Step 4: Draai de test, verifieer dat hij slaagt**

Run: `npm test -- lib/todos.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/todos.ts lib/todos.test.ts
git commit -m "feat(todos): sortTodos helper + tests"
```

---

## Task 4: Server actions — `app/(app)/_actions/todos.ts`

**Files:**
- Create: `app/(app)/_actions/todos.ts`

> `_actions` is een privémap (underscore) — geen route, alleen colocatie van server actions.

- [ ] **Step 1: Schrijf de actions**

```ts
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
    if (aErr) return { error: aErr.message }
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

  const { error: delErr } = await supabase.from('todo_assignees').delete().eq('todo_id', id)
  if (delErr) return { error: delErr.message }

  if (profileIds.length > 0) {
    const { error: insErr } = await supabase
      .from('todo_assignees')
      .insert(profileIds.map((profile_id) => ({ todo_id: id, profile_id })))
    if (insErr) return { error: insErr.message }
  }
  return {}
}

export async function deleteTodo(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  const { error } = await supabase.from('todos').delete().eq('id', id)
  return error ? { error: error.message } : {}
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: geen fouten. (Bevestigt o.a. dat `requireAuth` bestaat en `user.id` levert — zoals in `leads/actions.ts`.)

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/_actions/todos.ts"
git commit -m "feat(todos): server actions"
```

---

## Task 5: Zustand-store — `store/taken.ts`

**Files:**
- Create: `store/taken.ts`

- [ ] **Step 1: Schrijf de store**

```ts
'use client'

import { create } from 'zustand'
import type { TodoWithAssignees, TeamMember, TodoAssignee } from '@/types/todo'
import type { TaskPriority } from '@/types/project'
import { sortTodos } from '@/lib/todos'
import {
  getTodos, getTeam, createTodo, toggleDone, updateTodo, setAssignees, deleteTodo,
} from '@/app/(app)/_actions/todos'

export interface NewTodoInput {
  titel: string
  notitie?: string | null
  deadline?: string | null
  prioriteit?: TaskPriority
  assignees?: string[]
}

interface TakenState {
  open: boolean
  loaded: boolean
  loading: boolean
  todos: TodoWithAssignees[]
  team: TeamMember[]
  openDrawer: () => Promise<void>
  closeDrawer: () => void
  add: (input: NewTodoInput) => Promise<void>
  toggle: (id: string) => Promise<void>
  patch: (id: string, updates: Partial<Pick<TodoWithAssignees, 'titel' | 'notitie' | 'deadline' | 'prioriteit'>>) => Promise<void>
  assign: (id: string, profileIds: string[]) => Promise<void>
  remove: (id: string) => Promise<void>
}

const assigneesFromTeam = (team: TeamMember[], ids: string[]): TodoAssignee[] =>
  team
    .filter((m) => ids.includes(m.id))
    .map((m) => ({ profile_id: m.id, profiles: { id: m.id, full_name: m.full_name, avatar_url: m.avatar_url } }))

export const useTakenStore = create<TakenState>((set, get) => ({
  open: false,
  loaded: false,
  loading: false,
  todos: [],
  team: [],

  openDrawer: async () => {
    set({ open: true })
    if (get().loaded || get().loading) return
    set({ loading: true })
    const [todos, team] = await Promise.all([getTodos(), getTeam()])
    set({ todos: sortTodos(todos), team, loaded: true, loading: false })
  },

  closeDrawer: () => set({ open: false }),

  add: async (input) => {
    const temp: TodoWithAssignees = {
      id: `temp-${Date.now()}`,
      user_id: '', titel: input.titel, notitie: input.notitie ?? null,
      done: false, deadline: input.deadline ?? null,
      prioriteit: input.prioriteit ?? 'normaal', volgorde: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      assignees: assigneesFromTeam(get().team, input.assignees ?? []),
    }
    set((s) => ({ todos: sortTodos([temp, ...s.todos]) }))
    const { todo, error } = await createTodo(input)
    if (error || !todo) {
      set((s) => ({ todos: s.todos.filter((t) => t.id !== temp.id) }))
      return
    }
    set((s) => ({ todos: sortTodos(s.todos.map((t) => (t.id === temp.id ? todo : t))) }))
  },

  toggle: async (id) => {
    const prev = get().todos
    set({ todos: sortTodos(prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))) })
    const target = prev.find((t) => t.id === id)
    const { error } = await toggleDone(id, !target?.done)
    if (error) set({ todos: prev })
  },

  patch: async (id, updates) => {
    const prev = get().todos
    set({ todos: prev.map((t) => (t.id === id ? { ...t, ...updates } : t)) })
    const { error } = await updateTodo(id, updates)
    if (error) set({ todos: prev })
  },

  assign: async (id, profileIds) => {
    const prev = get().todos
    set({ todos: prev.map((t) => (t.id === id ? { ...t, assignees: assigneesFromTeam(get().team, profileIds) } : t)) })
    const { error } = await setAssignees(id, profileIds)
    if (error) set({ todos: prev })
  },

  remove: async (id) => {
    const prev = get().todos
    set({ todos: prev.filter((t) => t.id !== id) })
    const { error } = await deleteTodo(id)
    if (error) set({ todos: prev })
  },
}))
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: geen fouten.

- [ ] **Step 3: Commit**

```bash
git add store/taken.ts
git commit -m "feat(todos): zustand-store met optimistische updates"
```

---

## Task 6: Pickers — D2 / P3 / T2 als gedeelde componenten

**Files:**
- Create: `components/todos/DateShortcutsPicker.tsx`
- Create: `components/todos/PriorityFlags.tsx`
- Create: `components/todos/AssigneeDropdown.tsx`

> Gepromoveerd uit het prototype (`app/(app)/taken-prototype/pickers/page.tsx`). Let op: `SvgIcon` neemt géén `style`-prop — kleur via een omhullende `<span style>`. Multi-select gebruikt een **functionele toggle-prop** (`onToggle`), niet `onChange(value…)` (stale-closure-bug uit het prototype).

- [ ] **Step 1: `DateShortcutsPicker.tsx`**

```tsx
'use client'

import * as React from 'react'
import { nl } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { fmtDate, addDays, toLocalDateStr } from '@/lib/dates'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const PILL =
  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-xs text-secondary-foreground outline-none transition-colors hover:bg-bg-3'

function parseValue(v?: string): Date | undefined {
  if (!v) return undefined
  const [y, m, d] = v.split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d, 12) : undefined
}
const today = () => toLocalDateStr(new Date())
const label = (v: string) => fmtDate(v, { weekday: 'short', day: 'numeric', month: 'short' })

export function DateShortcutsPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false)
  const pick = (v: string) => { onChange(v); setOpen(false) }
  const shortcuts = [
    { label: 'Vandaag', v: today() },
    { label: 'Morgen', v: addDays(today(), 1) },
    { label: 'Volgende week', v: addDays(today(), 7) },
  ]
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(PILL, !value && 'text-fg-3')}>
        <SvgIcon name="calendar" size={12} />
        {value ? label(value) : 'Datum'}
      </PopoverTrigger>
      <PopoverContent align="start" className="pointer-events-auto w-auto gap-0 p-0">
        <div className="flex flex-col p-1.5">
          {shortcuts.map((s) => (
            <button key={s.label} onClick={() => pick(s.v)}
              className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] text-fg-1 hover:bg-bg-3">
              {s.label}<span className="text-[11px] text-fg-3">{label(s.v)}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-border-subtle">
          <Calendar mode="single" selected={parseValue(value)} defaultMonth={parseValue(value)}
            onSelect={(d) => d && pick(toLocalDateStr(d))} locale={nl} />
        </div>
        {value && (
          <button onClick={() => pick('')}
            className="w-full border-t border-border-subtle px-3 py-2 text-center text-xs text-fg-3 hover:text-fg-1">
            Wis datum
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 2: `PriorityFlags.tsx`**

```tsx
'use client'

import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { PRIORITY_CONFIG, PRIORITY_ICON, type TaskPriority } from '@/types/project'

const PRIOS: TaskPriority[] = ['laag', 'normaal', 'hoog', 'urgent']

export function PriorityGlyph({ p, size = 13 }: { p: TaskPriority; size?: number }) {
  return (
    <span className="inline-flex" style={{ color: PRIORITY_CONFIG[p].color }}>
      <SvgIcon name={PRIORITY_ICON[p]} size={size} />
    </span>
  )
}

export function PriorityFlags({ value, onChange }: { value: TaskPriority; onChange: (v: TaskPriority) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary p-0.5">
      {PRIOS.map((p) => {
        const active = value === p
        return (
          <button key={p} onClick={() => onChange(p)} aria-label={PRIORITY_CONFIG[p].label}
            title={PRIORITY_CONFIG[p].label} aria-pressed={active}
            className={cn('grid size-6 place-content-center rounded-full transition-colors',
              active ? '' : 'opacity-40 hover:opacity-100')}
            style={active ? { background: PRIORITY_CONFIG[p].bg } : undefined}>
            <PriorityGlyph p={p} size={14} />
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: `AssigneeDropdown.tsx`**

```tsx
'use client'

import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarStack } from '@/components/ui/AvatarStack'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/DropdownMenu'
import type { TeamMember } from '@/types/todo'

const PILL =
  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-xs text-secondary-foreground outline-none transition-colors hover:bg-bg-3'

export function AssigneeDropdown({
  value, team, onToggle, ringClass = 'ring-secondary',
}: {
  value: string[]
  team: TeamMember[]
  onToggle: (id: string) => void
  ringClass?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(PILL, value.length === 0 && 'text-fg-3')}>
        {value.length > 0 ? (
          <AvatarStack
            people={value.map((id) => ({ key: id, name: team.find((t) => t.id === id)?.full_name ?? undefined, src: team.find((t) => t.id === id)?.avatar_url }))}
            size={16} overlap={5} ringClass={ringClass}
          />
        ) : (
          <SvgIcon name="user-plus" size={12} />
        )}
        {value.length > 0 ? `${value.length} toegewezen` : 'Toewijzen'}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        {team.map((t) => {
          const on = value.includes(t.id)
          return (
            <DropdownMenuItem key={t.id} onSelect={(e) => { e.preventDefault(); onToggle(t.id) }} className="justify-between">
              <span className="flex items-center gap-2">
                <Avatar src={t.avatar_url} name={t.full_name ?? undefined} size={20} />
                {t.full_name ?? 'Onbekend'}
              </span>
              {on && <SvgIcon name="check" size={14} className="text-fg-2" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: geen fouten.

- [ ] **Step 5: Commit**

```bash
git add components/todos/DateShortcutsPicker.tsx components/todos/PriorityFlags.tsx components/todos/AssigneeDropdown.tsx
git commit -m "feat(todos): D2/P3/T2 pickers als gedeelde componenten"
```

---

## Task 7: `TodoRow` — variant-B-rij met inline pickers

**Files:**
- Create: `components/todos/TodoRow.tsx`

- [ ] **Step 1: Schrijf het component**

```tsx
'use client'

import { cn } from '@/lib/utils'
import { fmtDate } from '@/lib/dates'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { DateShortcutsPicker } from '@/components/todos/DateShortcutsPicker'
import { PriorityFlags } from '@/components/todos/PriorityFlags'
import { AssigneeDropdown } from '@/components/todos/AssigneeDropdown'
import type { TodoWithAssignees, TeamMember } from '@/types/todo'

export function TodoRow({
  todo, team, onToggle, onDate, onPriority, onAssignToggle, onDelete,
}: {
  todo: TodoWithAssignees
  team: TeamMember[]
  onToggle: () => void
  onDate: (v: string) => void
  onPriority: (v: TodoWithAssignees['prioriteit']) => void
  onAssignToggle: (id: string) => void
  onDelete: () => void
}) {
  return (
    <div className="group flex items-start gap-3 py-3">
      <button type="button" onClick={onToggle}
        aria-label={todo.done ? 'Markeer als onvoltooid' : 'Markeer als voltooid'}
        className={cn('mt-0.5 grid size-[18px] shrink-0 place-content-center rounded-full border transition-colors',
          todo.done ? 'border-green-500 bg-green-500/15 text-green-500' : 'border-border-strong text-transparent hover:border-fg-2')}>
        <SvgIcon name="check" size={11} />
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn('text-[15px] leading-snug', todo.done ? 'text-fg-3 line-through' : 'text-fg-1')}>
          {todo.titel}
        </p>
        {todo.notitie && <p className="mt-0.5 text-[13px] leading-snug text-fg-2">{todo.notitie}</p>}

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <DateShortcutsPicker value={todo.deadline ?? ''} onChange={onDate} />
          <PriorityFlags value={todo.prioriteit} onChange={onPriority} />
          <AssigneeDropdown
            value={todo.assignees.map((a) => a.profile_id)}
            team={team}
            onToggle={onAssignToggle}
          />
          {todo.assignees.length > 0 && (
            <AvatarStack
              people={todo.assignees.map((a) => ({ key: a.profile_id, name: a.profiles.full_name ?? undefined, src: a.profiles.avatar_url }))}
              size={18} overlap={5} ringClass="ring-bg-1"
            />
          )}
        </div>
      </div>

      <button type="button" onClick={onDelete} aria-label="Taak verwijderen"
        className="mt-0.5 shrink-0 text-fg-3 opacity-0 transition-opacity hover:text-fg-1 group-hover:opacity-100">
        <SvgIcon name="trash" size={14} />
      </button>
    </div>
  )
}
```

> `fmtDate` blijft beschikbaar voor toekomstige read-only weergave; de pills tonen de datum nu zelf. Verwijder de import als lint klaagt over ongebruikt — controleer in Step 2.

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: geen fouten. Verwijder de ongebruikte `fmtDate`-import als de linter daarover klaagt.

- [ ] **Step 3: Verifieer dat `trash` als icoon bestaat**

Run: `ls public/icons/trash.svg`
Expected: bestaat. Zo niet: kies een bestaand icoon (`ls public/icons | grep -iE "trash|delete|x"`) en gebruik dat in plaats van `trash`.

- [ ] **Step 4: Commit**

```bash
git add components/todos/TodoRow.tsx
git commit -m "feat(todos): TodoRow (variant B) met inline pickers"
```

---

## Task 8: `TakenDrawer` — kop + quick-add + lijst

**Files:**
- Create: `components/todos/TakenDrawer.tsx`

- [ ] **Step 1: Schrijf het component**

```tsx
'use client'

import * as React from 'react'
import { useTakenStore } from '@/store/taken'
import { AppDrawer, AppDrawerHeader, AppDrawerBody } from '@/components/ui/AppDrawer'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { EmptyState } from '@/components/ui/EmptyState'
import { TodoRow } from '@/components/todos/TodoRow'
import { DateShortcutsPicker } from '@/components/todos/DateShortcutsPicker'
import { PriorityFlags } from '@/components/todos/PriorityFlags'
import { AssigneeDropdown } from '@/components/todos/AssigneeDropdown'
import type { TaskPriority } from '@/types/project'

export function TakenDrawer() {
  const { open, loading, todos, team, closeDrawer, openDrawer, add, toggle, patch, assign, remove } = useTakenStore()

  // Quick-add draft-state
  const [titel, setTitel] = React.useState('')
  const [deadline, setDeadline] = React.useState('')
  const [prioriteit, setPrioriteit] = React.useState<TaskPriority>('normaal')
  const [assignees, setAssignees] = React.useState<string[]>([])

  // Globale sneltoets ⌘⇧T / Ctrl⇧T
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        if (useTakenStore.getState().open) closeDrawer()
        else void openDrawer()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openDrawer, closeDrawer])

  function submit() {
    if (!titel.trim()) return
    void add({ titel: titel.trim(), deadline: deadline || null, prioriteit, assignees })
    setTitel(''); setDeadline(''); setPrioriteit('normaal'); setAssignees([])
  }

  const toggleDraftAssignee = (id: string) =>
    setAssignees((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))

  return (
    <AppDrawer open={open} onOpenChange={(o) => (o ? void openDrawer() : closeDrawer())} title="Mijn taken" width={460}>
      <AppDrawerHeader>
        <span className="text-[13px] font-medium text-fg-1">Mijn taken</span>
        <Button variant="ghost" size="icon-sm" aria-label="Sluiten" onClick={closeDrawer}>
          <SvgIcon name="x" size={16} />
        </Button>
      </AppDrawerHeader>

      <AppDrawerBody>
        {/* Quick-add */}
        <div className="rounded-lg border border-border-subtle bg-bg-2 p-3" data-vaul-no-drag>
          <input
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Nieuwe taak…"
            className="w-full bg-transparent text-[15px] text-fg-1 outline-none placeholder:text-fg-3"
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <DateShortcutsPicker value={deadline} onChange={setDeadline} />
            <PriorityFlags value={prioriteit} onChange={setPrioriteit} />
            <AssigneeDropdown value={assignees} team={team} onToggle={toggleDraftAssignee} />
            <Button size="sm" className="ml-auto" disabled={!titel.trim()} onClick={submit}>Toevoegen</Button>
          </div>
        </div>

        {/* Lijst */}
        {loading ? (
          <p className="px-1 py-6 text-center text-[13px] text-fg-3">Laden…</p>
        ) : todos.length === 0 ? (
          <EmptyState icon="list-check" title="Nog geen taken." description="Voeg je eerste taak toe hierboven." />
        ) : (
          <div className="divide-y divide-border-subtle/60">
            {todos.map((t) => (
              <TodoRow
                key={t.id}
                todo={t}
                team={team}
                onToggle={() => void toggle(t.id)}
                onDate={(v) => void patch(t.id, { deadline: v || null })}
                onPriority={(v) => void patch(t.id, { prioriteit: v })}
                onAssignToggle={(id) => {
                  const cur = t.assignees.map((a) => a.profile_id)
                  void assign(t.id, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
                }}
                onDelete={() => void remove(t.id)}
              />
            ))}
          </div>
        )}
      </AppDrawerBody>
    </AppDrawer>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: geen fouten.

- [ ] **Step 3: Commit**

```bash
git add components/todos/TakenDrawer.tsx
git commit -m "feat(todos): TakenDrawer met quick-add + lijst + sneltoets"
```

---

## Task 9: Globale mount + topbar-trigger

**Files:**
- Modify: `app/(app)/layout.tsx`
- Modify: `components/layout/TopBar.tsx`

- [ ] **Step 1: Mount de drawer in de layout**

In `app/(app)/layout.tsx`: voeg de import toe en render `<TakenDrawer />` als laatste kind binnen de root-`div` (na de tweede `</div>` van de content-area, vóór de afsluitende root-`</div>`).

```tsx
// bovenaan bij de imports:
import { TakenDrawer } from "@/components/todos/TakenDrawer"
```

```tsx
// ... bestaande JSX ...
        </div>
      </div>

      <TakenDrawer />
    </div>
  )
}
```

- [ ] **Step 2: Voeg de trigger-knop toe in de TopBar**

In `components/layout/TopBar.tsx`: importeer de store en zet een icoon-knop in de rechter-cel, vóór de bestaande user-`DropdownMenu`.

```tsx
// bij de imports:
import { useTakenStore } from "@/store/taken"
```

```tsx
// vervang de openingstag van de rechter-cel:
//   <div className="flex items-center justify-end">
// door:
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => void useTakenStore.getState().openDrawer()}
          aria-label="Mijn taken (⌘⇧T)"
          title="Mijn taken (⌘⇧T)"
          className="flex items-center justify-center size-[28px] rounded-md border-none bg-transparent cursor-pointer text-fg-2 transition-colors hover:bg-bg-3 hover:text-fg-1"
        >
          <SvgIcon name="list-check" size={16} />
        </button>
```

> Laat de rest van de rechter-cel (de `DropdownMenu`) ongewijzigd; alleen de wrapper-`div` krijgt `gap-1` en de knop ervoor.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: geen fouten.

- [ ] **Step 4: Verifieer end-to-end in de preview**

Volg de preview-workflow:
1. `preview_start` (of hergebruik) en open een willekeurige pagina, bv. `/dashboard`.
2. Klik de nieuwe taken-knop in de topbar (of druk `⌘⇧T`) → de drawer opent.
3. Typ een titel, kies via D2 "Morgen", zet prioriteit op "Hoog" (P3), wijs een teamlid toe (T2), klik **Toevoegen**.
4. `preview_screenshot` → bevestig dat de taak bovenaan verschijnt met datum-pill, oranje prioriteit-glyph en avatar.
5. Vink de taak af → titel krijgt doorhaling en zakt naar onderen.
6. `preview_console_logs` → geen errors. Controleer met Supabase MCP `execute_sql` (`select titel, done, deadline, prioriteit from public.todos order by created_at desc limit 3;`) dat de rij echt is opgeslagen.

Los gevonden problemen op in de bronbestanden en herhaal vanaf stap 4.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/layout.tsx" components/layout/TopBar.tsx
git commit -m "feat(todos): globale mount + topbar-trigger + sneltoets"
```

---

## Task 10: Design-system — DemoBlocks + inventaris

**Files:**
- Modify: `components/design-system/DomainSection.tsx`
- Modify: `docs/DESIGN-SYSTEM.md`

- [ ] **Step 1: Voeg DemoBlocks toe**

In `components/design-system/DomainSection.tsx`: importeer de pickers + `TodoRow` en de benodigde state, en voeg onderaan de bestaande sectie (vóór de afsluitende wrapper) DemoBlocks toe. Gebruik het bestaande `DemoBlock`-patroon (`title`, `path`, `description`, children). Voorbeeld voor de pickers:

```tsx
// imports bovenaan toevoegen:
import { useState } from 'react'
import { DateShortcutsPicker } from '@/components/todos/DateShortcutsPicker'
import { PriorityFlags } from '@/components/todos/PriorityFlags'
import { AssigneeDropdown } from '@/components/todos/AssigneeDropdown'
import type { TaskPriority } from '@/types/project'
```

```tsx
// in de component, lokale demo-state (bovenaan de functie):
const [demoDate, setDemoDate] = useState('')
const [demoPrio, setDemoPrio] = useState<TaskPriority>('hoog')
const [demoTeam, setDemoTeam] = useState<string[]>([])
const demoMembers = [
  { id: '1', full_name: 'Jordi Klavers', avatar_url: null },
  { id: '2', full_name: 'Sam de Vries', avatar_url: null },
]
```

```tsx
// DemoBlocks binnen de sectie:
<DemoBlock title="DateShortcutsPicker" path="@/components/todos/DateShortcutsPicker"
  description="Datum-picker met snelkoppelingen (vandaag/morgen/volgende week) + kalender.">
  <DateShortcutsPicker value={demoDate} onChange={setDemoDate} />
</DemoBlock>

<DemoBlock title="PriorityFlags" path="@/components/todos/PriorityFlags"
  description="Prioriteit zetten met één tik op een van de vier flags.">
  <PriorityFlags value={demoPrio} onChange={setDemoPrio} />
</DemoBlock>

<DemoBlock title="AssigneeDropdown" path="@/components/todos/AssigneeDropdown"
  description="Teamleden toewijzen (multi-select) met avatars.">
  <AssigneeDropdown value={demoTeam} team={demoMembers}
    onToggle={(id) => setDemoTeam((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))} />
</DemoBlock>
```

> Als `DomainSection` geen `'use client'` heeft maar nu state nodig heeft, voeg `'use client'` bovenaan toe. `TodoRow` en `TakenDrawer` hebben store-/callback-afhankelijkheden; demo ze niet live — vermeld ze alleen in de inventaris (Step 2).

- [ ] **Step 2: Voeg inventaris-rijen toe aan `docs/DESIGN-SYSTEM.md`**

Voeg in §2 onder "Domein-componenten (gedeeld)" deze rijen toe:

```markdown
| `DateShortcutsPicker` | `components/todos/DateShortcutsPicker` | Datum-picker: snelkoppelingen + kalender in een popover (todo-module) |
| `PriorityFlags` | `components/todos/PriorityFlags` | Prioriteit zetten met inline flags; voed met `PRIORITY_CONFIG`/`PRIORITY_ICON` |
| `AssigneeDropdown` | `components/todos/AssigneeDropdown` | Teamleden toewijzen (multi-select) met avatars |
| `TodoRow` | `components/todos/TodoRow` | Persoonlijke-todo-rij (variant B) met inline pickers |
| `TakenDrawer` | `components/todos/TakenDrawer` | Globale "Mijn taken"-drawer (quick-add + lijst); open via `useTakenStore` / ⌘⇧T |
```

- [ ] **Step 3: Verifieer in de preview**

Open `/design-system`, scroll naar de domein-sectie, `preview_screenshot` → de drie picker-DemoBlocks renderen en zijn interactief. `preview_console_logs` → geen errors.

- [ ] **Step 4: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add components/design-system/DomainSection.tsx docs/DESIGN-SYSTEM.md
git commit -m "docs(design-system): demo's + inventaris voor todo-componenten"
```

---

## Task 11: Prototype opruimen + eindcontrole

**Files:**
- Delete: `app/(app)/taken-prototype/` (beide pagina's)

- [ ] **Step 1: Verwijder de prototype-routes**

```bash
git rm -r "app/(app)/taken-prototype"
```

- [ ] **Step 2: Volledige controle**

Run: `npm run typecheck && npm run lint && npm test`
Expected: alles slaagt; geen verwijzingen meer naar `taken-prototype`.

- [ ] **Step 3: Laatste rooktest in de preview**

Herhaal de end-to-end-check uit Taak 9 Step 4 op een schone reload, plus: open de drawer op twee verschillende pagina's en bevestig dezelfde lijst. `preview_console_logs` → geen errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(todos): prototype-routes verwijderd"
```

---

## Self-review (uitgevoerd)

- **Spec-dekking:** §3 db → Taak 1; §4 types → Taak 2; §5 dataflow (store + actions, geen revalidate) → Taken 4–5; §6 componenten → Taken 6–8 + design-system Taak 10; §7 globale toegang + ⌘⇧T → Taak 9; §8 open punten: #1 strenge RLS (Taak 1), #2 `profiles.id=auth.uid()` (geverifieerd), #3 sneltoets ⌘⇧T (Taak 9), #5 prototype verwijderen (Taak 11). #4 (titel inline bewerken) is **bewust uit scope** voor v1 — todo's worden via verwijderen+opnieuw of later toegevoegd; toegevoegd als YAGNI-noot.
- **Placeholders:** geen TBD/“handle errors”; alle stappen bevatten echte code of exacte commando's.
- **Type-consistentie:** `TodoWithAssignees`, `TeamMember`, `NewTodoInput`, `sortTodos`, en de store-methoden (`openDrawer/closeDrawer/add/toggle/patch/assign/remove`) zijn identiek benoemd in Taken 2→5→8. Server-action-namen (`getTodos/getTeam/createTodo/toggleDone/updateTodo/setAssignees/deleteTodo`) matchen tussen Taak 4 en de store-import in Taak 5.

> **Openstaand klein punt (niet blokkerend):** titel/notitie van een bestaande todo inline bewerken zit niet in v1. Toevoegen wanneer dat in gebruik nodig blijkt (extra `patch`-aanroep op een bewerkbaar titel-veld in `TodoRow`).
