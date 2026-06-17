'use client'

// ponytail: throwaway prototype — mock data, geen Supabase. Doel: vormgeving van
// een snelle todo-lijst + quick-add drawer kiezen. Niet productie-bedoeld.

import * as React from 'react'
import { cn } from '@/lib/utils'
import { fmtDate } from '@/lib/dates'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { DatePicker } from '@/components/ui/DatePicker'
import { PillSelect } from '@/components/ui/PillSelect'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  AppDrawer,
  AppDrawerHeader,
  AppDrawerBody,
  AppDrawerFooter,
} from '@/components/ui/AppDrawer'
import { PRIORITY_CONFIG, PRIORITY_ICON, type TaskPriority } from '@/types/project'

// ─── Mock data ────────────────────────────────────────────────────────────────

const TEAM = [
  { id: '1', full_name: 'Jordi Klavers' },
  { id: '2', full_name: 'Sam de Vries' },
  { id: '3', full_name: 'Noa Jansen' },
]

interface Todo {
  id: string
  titel: string
  notitie?: string
  done: boolean
  deadline?: string
  prioriteit: TaskPriority
  assignees: string[] // team ids
}

const SEED: Todo[] = [
  { id: 't1', titel: 'Nieuwe afspraak maken met Kapito', done: false, deadline: '2026-05-14', prioriteit: 'hoog', assignees: ['1', '2'] },
  { id: 't2', titel: 'WIKO proces stappen', notitie: 'Uitwerken in Notion en delen met het team', done: false, prioriteit: 'normaal', assignees: [] },
  { id: 't3', titel: 'Sprintto dev pagina', done: false, prioriteit: 'normaal', assignees: ['3'] },
  { id: 't4', titel: 'Bioaktief thema', done: false, prioriteit: 'laag', assignees: [] },
  { id: 't5', titel: 'Loom maken markant WIKO', done: true, prioriteit: 'urgent', assignees: ['1'] },
]

// ─── Bouwstenen ─────────────────────────────────────────────────────────────

/** Ronde checkbox zoals in de Figma (open cirkel → groen vinkje). */
function RoundCheck({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={done ? 'Markeer als onvoltooid' : 'Markeer als voltooid'}
      className={cn(
        'grid size-[18px] shrink-0 place-content-center rounded-full border transition-colors',
        done
          ? 'border-green-500 bg-green-500/15 text-green-500'
          : 'border-border-strong text-transparent hover:border-fg-2',
      )}
    >
      <SvgIcon name="check" size={11} />
    </button>
  )
}

function people(ids: string[]) {
  return ids
    .map((id) => TEAM.find((t) => t.id === id))
    .filter((p): p is (typeof TEAM)[number] => Boolean(p))
    .map((p) => ({ key: p.id, name: p.full_name }))
}

/** Datum-chip — kalender + lange NL-datum, zoals de Figma. */
function DateMeta({ deadline }: { deadline: string }) {
  const label = fmtDate(deadline, { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-fg-3">
      <SvgIcon name="calendar" size={13} />
      <span className="capitalize">{label}</span>
    </span>
  )
}

/** Prioriteit-chip — signaalstaafjes + label, in prioriteitskleur. */
function PrioMeta({ prioriteit }: { prioriteit: TaskPriority }) {
  if (prioriteit === 'normaal') return null
  const prio = PRIORITY_CONFIG[prioriteit]
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-fg-2">
      <span className="inline-flex" style={{ color: prio.color }}>
        <SvgIcon name={PRIORITY_ICON[prioriteit]} size={13} />
      </span>
      {prio.label}
    </span>
  )
}

// ─── Drie vormgevings-varianten van een rij ─────────────────────────────────

type RowProps = { todo: Todo; onToggle: () => void }

/** A — Compact: alles op één regel, meta rechts uitgelijnd. */
function RowCompact({ todo, onToggle }: RowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <RoundCheck done={todo.done} onToggle={onToggle} />
      <span className={cn('flex-1 truncate text-[14px]', todo.done ? 'text-fg-3 line-through' : 'text-fg-1')}>
        {todo.titel}
      </span>
      <div className="flex shrink-0 items-center gap-4">
        {todo.deadline && <DateMeta deadline={todo.deadline} />}
        <PrioMeta prioriteit={todo.prioriteit} />
        {todo.assignees.length > 0 && (
          <AvatarStack people={people(todo.assignees)} size={18} overlap={5} ringClass="ring-bg-0" />
        )}
      </div>
    </div>
  )
}

/** B — Gestapeld (Figma): titel boven, meta-regel eronder. */
function RowStacked({ todo, onToggle }: RowProps) {
  const hasMeta = todo.deadline || todo.prioriteit !== 'normaal' || todo.assignees.length > 0
  return (
    <div className="flex items-start gap-3 py-3">
      <RoundCheck done={todo.done} onToggle={onToggle} />
      <div className="min-w-0 flex-1">
        <p className={cn('text-[15px] leading-snug', todo.done ? 'text-fg-3 line-through' : 'text-fg-1')}>
          {todo.titel}
        </p>
        {todo.notitie && <p className="mt-0.5 text-[13px] leading-snug text-fg-2">{todo.notitie}</p>}
        {hasMeta && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            {todo.deadline && <DateMeta deadline={todo.deadline} />}
            <PrioMeta prioriteit={todo.prioriteit} />
            {todo.assignees.length > 0 && (
              <AvatarStack people={people(todo.assignees)} size={18} overlap={5} ringClass="ring-bg-0" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** C — Kaart: elke taak in een bg-2-kaart. */
function RowCard({ todo, onToggle }: RowProps) {
  const hasMeta = todo.deadline || todo.prioriteit !== 'normaal' || todo.assignees.length > 0
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-bg-2 px-3.5 py-3">
      <RoundCheck done={todo.done} onToggle={onToggle} />
      <div className="min-w-0 flex-1">
        <p className={cn('text-[14px] leading-snug', todo.done ? 'text-fg-3 line-through' : 'text-fg-1')}>
          {todo.titel}
        </p>
        {todo.notitie && <p className="mt-0.5 text-[12px] leading-snug text-fg-2">{todo.notitie}</p>}
        {hasMeta && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            {todo.deadline && <DateMeta deadline={todo.deadline} />}
            <PrioMeta prioriteit={todo.prioriteit} />
            {todo.assignees.length > 0 && (
              <AvatarStack people={people(todo.assignees)} size={18} overlap={5} ringClass="ring-bg-2" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const VARIANTS = [
  { key: 'compact', titel: 'A — Compact', sub: 'Eén regel, meta rechts. Dichtste lijst.', Row: RowCompact, gap: 'divide-y divide-border-subtle/60' },
  { key: 'stacked', titel: 'B — Gestapeld (Figma)', sub: 'Titel boven, meta eronder. Ademruimte + tweede regel.', Row: RowStacked, gap: 'divide-y divide-border-subtle/60' },
  { key: 'card', titel: 'C — Kaarten', sub: 'Elke taak als losse kaart. Het meest "tikbaar".', Row: RowCard, gap: 'flex flex-col gap-2' },
] as const

// ─── Quick-add drawer ─────────────────────────────────────────────────────────

function QuickAddDrawer({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onAdd: (t: Todo) => void
}) {
  const [titel, setTitel] = React.useState('')
  const [notitie, setNotitie] = React.useState('')
  const [deadline, setDeadline] = React.useState('')
  const [prioriteit, setPrioriteit] = React.useState<TaskPriority>('normaal')
  const [assignee, setAssignee] = React.useState('')

  function reset() {
    setTitel(''); setNotitie(''); setDeadline(''); setPrioriteit('normaal'); setAssignee('')
  }

  function submit() {
    if (!titel.trim()) return
    onAdd({
      id: `t${Math.round(performance.now())}`,
      titel: titel.trim(),
      notitie: notitie.trim() || undefined,
      done: false,
      deadline: deadline || undefined,
      prioriteit,
      assignees: assignee ? [assignee] : [],
    })
    reset()
    onOpenChange(false)
  }

  return (
    <AppDrawer open={open} onOpenChange={onOpenChange} title="Nieuwe taak" width={460}>
      <AppDrawerHeader>
        <span className="text-[13px] font-medium text-fg-1">Nieuwe taak</span>
        <Button variant="ghost" size="icon-sm" aria-label="Sluiten" onClick={() => onOpenChange(false)}>
          <SvgIcon name="x" size={16} />
        </Button>
      </AppDrawerHeader>

      <AppDrawerBody>
        <input
          autoFocus
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Wat moet er gebeuren?"
          className="w-full bg-transparent text-[16px] text-fg-1 outline-none placeholder:text-fg-3"
        />
        <Textarea
          value={notitie}
          onChange={(e) => setNotitie(e.target.value)}
          placeholder="Notitie (optioneel)"
          rows={3}
          className="resize-none border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
        />

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <DatePicker variant="pill" value={deadline} onChange={setDeadline} placeholder="Datum" />
          <PillSelect
            icon={PRIORITY_ICON[prioriteit]}
            value={prioriteit}
            onChange={(v) => setPrioriteit(v as TaskPriority)}
          >
            <option value="laag">Laag</option>
            <option value="normaal">Normaal</option>
            <option value="hoog">Hoog</option>
            <option value="urgent">Urgent</option>
          </PillSelect>
          <PillSelect icon="user-plus" value={assignee} onChange={setAssignee}>
            <option value="">Niemand</option>
            {TEAM.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </PillSelect>
        </div>
      </AppDrawerBody>

      <AppDrawerFooter>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Annuleren</Button>
        <Button size="sm" disabled={!titel.trim()} onClick={submit}>Toevoegen</Button>
      </AppDrawerFooter>
    </AppDrawer>
  )
}

// ─── Pagina ─────────────────────────────────────────────────────────────────

export default function TakenPrototypePage() {
  const [todos, setTodos] = React.useState<Todo[]>(SEED)
  const [open, setOpen] = React.useState(false)

  const toggle = (id: string) =>
    setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))

  const add = (t: Todo) => setTodos((ts) => [t, ...ts])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-8 py-10">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-medium tracking-tight text-fg-1">Taken — prototype</h1>
            <p className="mt-1 text-[13px] text-fg-2">
              Drie vormgevingen van dezelfde snelle todo-lijst. Vink af, of voeg toe via de drawer.
            </p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <SvgIcon name="plus" size={14} /> Snelle taak
          </Button>
        </header>

        {todos.length === 0 ? (
          <EmptyState icon="list-check" title="Nog geen taken." />
        ) : (
          <div className="flex flex-col gap-12">
            {VARIANTS.map(({ key, titel, sub, Row, gap }) => (
              <section key={key}>
                <div className="mb-3 border-b border-border-subtle pb-2">
                  <h2 className="text-[13px] font-medium text-fg-1">{titel}</h2>
                  <p className="text-[12px] text-fg-3">{sub}</p>
                </div>
                <div className={gap}>
                  {todos.map((t) => (
                    <Row key={t.id} todo={t} onToggle={() => toggle(t.id)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Globale trigger — staat overal, want hangt aan de app-shell. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Snelle taak toevoegen"
        className="fixed bottom-6 right-6 z-40 grid size-12 place-content-center rounded-full bg-fg-1 text-bg-0 shadow-lg transition-transform hover:scale-105"
      >
        <SvgIcon name="plus" size={20} />
      </button>

      <QuickAddDrawer open={open} onOpenChange={setOpen} onAdd={add} />
    </div>
  )
}
