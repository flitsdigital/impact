'use client'

// ponytail: throwaway prototype — varianten voor het AANMAKEN van een taak +
// een compactere rij. Mock-state, hergebruikt de echte pickers uit components/todos.

import * as React from 'react'
import { cn } from '@/lib/utils'
import { fmtDate } from '@/lib/dates'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Button } from '@/components/ui/Button'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { DateShortcutsPicker } from '@/components/todos/DateShortcutsPicker'
import { PriorityFlags, PriorityGlyph } from '@/components/todos/PriorityFlags'
import { AssigneeDropdown } from '@/components/todos/AssigneeDropdown'
import { PRIORITY_CONFIG, type TaskPriority } from '@/types/project'
import type { TeamMember } from '@/types/todo'

const TEAM: TeamMember[] = [
  { id: '1', full_name: 'Jordi Klavers', avatar_url: null },
  { id: '2', full_name: 'Sam de Vries', avatar_url: null },
  { id: '3', full_name: 'Noa Jansen', avatar_url: null },
]

interface Draft {
  titel: string
  deadline: string
  prioriteit: TaskPriority
  assignees: string[]
}
const EMPTY: Draft = { titel: '', deadline: '', prioriteit: 'normaal', assignees: [] }

interface Todo extends Draft {
  id: string
  done: boolean
}

// ─── Compacte rij ──────────────────────────────────────────────────────────────

function CompactRow({ todo, onToggle }: { todo: Todo; onToggle: () => void }) {
  return (
    <div className="group flex items-center gap-2.5 py-1.5">
      <button
        type="button"
        onClick={onToggle}
        aria-label={todo.done ? 'Onvoltooid' : 'Voltooid'}
        className={cn(
          'grid size-4 shrink-0 place-content-center rounded-full border transition-colors',
          todo.done ? 'border-green-500 bg-green-500/15 text-green-500' : 'border-border-strong text-transparent hover:border-fg-2',
        )}
      >
        <SvgIcon name="check" size={9} />
      </button>
      <span className={cn('flex-1 truncate text-[13px]', todo.done ? 'text-fg-3 line-through' : 'text-fg-1')}>
        {todo.titel}
      </span>
      <div className="flex shrink-0 items-center gap-2.5 text-fg-3">
        {todo.deadline && (
          <span className="inline-flex items-center gap-1 text-[11px]">
            <SvgIcon name="calendar" size={11} />
            {fmtDate(todo.deadline, { day: 'numeric', month: 'short' })}
          </span>
        )}
        {todo.prioriteit !== 'normaal' && <PriorityGlyph p={todo.prioriteit} size={12} />}
        {todo.assignees.length > 0 && (
          <AvatarStack
            people={todo.assignees.map((id) => ({ key: id, name: TEAM.find((t) => t.id === id)?.full_name ?? undefined }))}
            size={16}
            overlap={4}
            ringClass="ring-bg-1"
          />
        )}
      </div>
    </div>
  )
}

// ─── Composer-varianten ─────────────────────────────────────────────────────────

type Variant = 'expand' | 'inline' | 'dock'

function Pills({ draft, set }: { draft: Draft; set: (d: Partial<Draft>) => void }) {
  const toggle = (id: string) =>
    set({ assignees: draft.assignees.includes(id) ? draft.assignees.filter((x) => x !== id) : [...draft.assignees, id] })
  return (
    <>
      <DateShortcutsPicker value={draft.deadline} onChange={(v) => set({ deadline: v })} />
      <PriorityFlags value={draft.prioriteit} onChange={(v) => set({ prioriteit: v })} />
      <AssigneeDropdown value={draft.assignees} team={TEAM} onToggle={toggle} />
    </>
  )
}

function Composer({ variant, onAdd }: { variant: Variant; onAdd: (d: Draft) => void }) {
  const [draft, setDraft] = React.useState<Draft>(EMPTY)
  const [focused, setFocused] = React.useState(false)
  const set = (d: Partial<Draft>) => setDraft((p) => ({ ...p, ...d }))
  const submit = () => {
    if (!draft.titel.trim()) return
    onAdd(draft)
    setDraft(EMPTY)
    setFocused(false)
  }
  const onKey = (e: React.KeyboardEvent) => e.key === 'Enter' && submit()

  // C1 — Uitklappend: rustig in rust, volledige controls bij focus.
  if (variant === 'expand') {
    const open = focused || draft.titel.length > 0
    return (
      <div className={cn('rounded-lg border bg-bg-2 transition-colors', open ? 'border-border-strong' : 'border-border-subtle')}>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <SvgIcon name="plus" size={16} className={open ? 'text-fg-2' : 'text-fg-3'} />
          <input
            value={draft.titel}
            onChange={(e) => set({ titel: e.target.value })}
            onFocus={() => setFocused(true)}
            onKeyDown={onKey}
            placeholder="Taak toevoegen…"
            className="w-full bg-transparent text-[14px] text-fg-1 outline-none placeholder:text-fg-3"
          />
        </div>
        {open && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle px-3 py-2.5">
            <Pills draft={draft} set={set} />
            <Button size="sm" className="ml-auto" disabled={!draft.titel.trim()} onClick={submit}>
              Toevoegen
            </Button>
          </div>
        )}
      </div>
    )
  }

  // C2 — Eén regel: alles altijd zichtbaar, Enter voegt toe.
  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-bg-2 px-3 py-2">
        <span className="grid size-4 shrink-0 place-content-center rounded-full border border-border-strong" />
        <input
          value={draft.titel}
          onChange={(e) => set({ titel: e.target.value })}
          onKeyDown={onKey}
          placeholder="Nieuwe taak…"
          className="min-w-[8rem] flex-1 bg-transparent text-[14px] text-fg-1 outline-none placeholder:text-fg-3"
        />
        <div className="flex items-center gap-1.5">
          <Pills draft={draft} set={set} />
        </div>
      </div>
    )
  }

  // C3 — Onderaan gedockt: invoer onderin het paneel, lijst scrollt erboven.
  return (
    <div className="flex items-center gap-2 border-t border-border-subtle bg-bg-1 px-3 py-2.5">
      <input
        value={draft.titel}
        onChange={(e) => set({ titel: e.target.value })}
        onKeyDown={onKey}
        placeholder="Schrijf een taak…"
        className="w-full bg-transparent text-[14px] text-fg-1 outline-none placeholder:text-fg-3"
      />
      <div className="flex items-center gap-1.5">
        <Pills draft={draft} set={set} />
      </div>
      <Button
        size="icon-sm"
        aria-label="Toevoegen"
        disabled={!draft.titel.trim()}
        onClick={submit}
      >
        <SvgIcon name="plus" size={15} />
      </Button>
    </div>
  )
}

// ─── Demo-blok ───────────────────────────────────────────────────────────────

let counter = 0
const newId = () => `p${counter++}`

function Demo({ variant, titel, hint }: { variant: Variant; titel: string; hint: string }) {
  const [todos, setTodos] = React.useState<Todo[]>([])
  const add = (d: Draft) => setTodos((t) => [{ ...d, id: newId(), done: false }, ...t])
  const toggle = (id: string) => setTodos((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)))

  const list = (
    <div className="flex flex-col">
      {todos.length === 0 ? (
        <p className="px-1 py-4 text-center text-[12px] text-fg-3">Nog niets toegevoegd — typ hierboven.</p>
      ) : (
        <div className="divide-y divide-border-subtle/60">
          {todos.map((t) => (
            <CompactRow key={t.id} todo={t} onToggle={() => toggle(t.id)} />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <section>
      <div className="mb-3 border-b border-border-subtle pb-2">
        <h2 className="text-[13px] font-medium text-fg-1">{titel}</h2>
        <p className="text-[12px] text-fg-3">{hint}</p>
      </div>

      {variant === 'dock' ? (
        // Mini-paneel: lijst boven, composer onderin gedockt.
        <div className="flex h-[300px] flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-1">
          <div className="flex-1 overflow-auto px-3 py-2">{list}</div>
          <Composer variant="dock" onAdd={add} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Composer variant={variant} onAdd={add} />
          {list}
        </div>
      )}
    </section>
  )
}

// ─── Pagina ─────────────────────────────────────────────────────────────────

export default function AanmakenPrototypePage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-10">
        <header className="mb-10">
          <h1 className="text-[24px] font-medium tracking-tight text-fg-1">Taak aanmaken — prototype</h1>
          <p className="mt-1 text-[13px] text-fg-2">
            Drie manieren om een taak toe te voegen, met compactere rijen eronder. Speel ermee en kies.
          </p>
        </header>

        <div className="flex flex-col gap-12">
          <Demo
            variant="expand"
            titel="C1 — Uitklappend"
            hint="Rustig in rust (alleen een invoerveld); de datum/prioriteit/teamlid-controls verschijnen zodra je begint te typen."
          />
          <Demo
            variant="inline"
            titel="C2 — Eén regel"
            hint="Alles altijd op één regel zichtbaar. Enter voegt toe. Snelste voor wie vaak taken bijgooit."
          />
          <Demo
            variant="dock"
            titel="C3 — Onderaan gedockt"
            hint="Invoer onderin het paneel (chat-stijl); de lijst scrollt erboven. Nieuwe taken komen bovenaan."
          />
        </div>
      </div>
    </div>
  )
}
