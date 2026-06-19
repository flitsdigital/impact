'use client'

import * as React from 'react'
import { nl } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { fmtDate, addDays, toLocalDateStr } from '@/lib/dates'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DateShortcutsPicker } from '@/components/todos/DateShortcutsPicker'
import { PriorityFlags, PriorityGlyph } from '@/components/todos/PriorityFlags'
import { AssigneeDropdown } from '@/components/todos/AssigneeDropdown'
import { PRIORITY_CONFIG, type TaskPriority } from '@/types/project'

// ponytail: één prototype-pagina met een switcher tussen interactie-varianten voor de
// taken-drawer. Hergebruikt de echte pickers (datum/prioriteit/assignee). Geen DemoBlock op
// /design-system tot er een winnaar gekozen is — dan pas naar een gedeeld component.

// ── Mock-data ────────────────────────────────────────────────────────────────
type Member = { id: string; full_name: string; avatar_url: string | null }
type Item = {
  id: string
  titel: string
  notitie?: string | null
  done: boolean
  deadline: string | null
  prioriteit: TaskPriority
  assignees: string[]
}

const TEAM: Member[] = [
  { id: 'u1', full_name: 'Jordi Klavers', avatar_url: null },
  { id: 'u2', full_name: 'Sam Lee', avatar_url: null },
  { id: 'u3', full_name: 'Mees Peters', avatar_url: null },
]

const INITIAL: Item[] = [
  { id: 't1', titel: 'Nieuwe afspraak maken met Kapito', notitie: null, done: false, deadline: '2026-05-14', prioriteit: 'hoog', assignees: ['u1', 'u2'] },
  { id: 't2', titel: 'WIKO proces stappen', notitie: 'Dit is twee lines', done: false, deadline: null, prioriteit: 'normaal', assignees: [] },
  { id: 't3', titel: 'Sprintto dev pagina', notitie: null, done: false, deadline: null, prioriteit: 'normaal', assignees: [] },
  { id: 't4', titel: 'Bioaktief thema', notitie: null, done: false, deadline: '2026-06-20', prioriteit: 'urgent', assignees: ['u3'] },
  { id: 't5', titel: 'Loom maken markant WIKO', notitie: null, done: true, deadline: null, prioriteit: 'laag', assignees: [] },
]

// ── Gedeelde bouwstenen ──────────────────────────────────────────────────────
function Check({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      aria-label={done ? 'Markeer als onvoltooid' : 'Markeer als voltooid'}
      className={cn(
        'grid size-[18px] shrink-0 place-content-center rounded-full border transition-colors',
        done ? 'border-green-500 bg-green-500/15 text-green-500' : 'border-border-strong text-transparent hover:border-fg-2',
      )}
    >
      <SvgIcon name="check" size={10} />
    </button>
  )
}

const dateLabel = (v: string) => fmtDate(v, { day: 'numeric', month: 'short' })

/** Read-only meta — gebruikt door rustige rijen. Vaste hoogte, verspringt nooit. */
function ReadMeta({ item, size = 16 }: { item: Item; size?: number }) {
  if (!item.deadline && item.prioriteit === 'normaal' && item.assignees.length === 0) return null
  return (
    <div className="flex shrink-0 items-center gap-2.5 text-fg-3">
      {item.deadline && (
        <span className="inline-flex items-center gap-1 text-[11px]">
          <SvgIcon name="calendar" size={11} />
          {dateLabel(item.deadline)}
        </span>
      )}
      {item.prioriteit !== 'normaal' && <PriorityGlyph p={item.prioriteit} size={12} />}
      {item.assignees.length > 0 && (
        <AvatarStack
          people={item.assignees.map((id) => ({ key: id, name: TEAM.find((t) => t.id === id)?.full_name, src: null }))}
          size={size} overlap={4} ringClass="ring-bg-1"
        />
      )}
    </div>
  )
}

type Handlers = {
  onToggle: (id: string) => void
  onPatch: (id: string, p: Partial<Item>) => void
  onAssign: (id: string, pid: string) => void
  onDelete: (id: string) => void
}

/** De drie echte editors achter elkaar — gebruikt in popovers / uitklap / kaarten. */
function Editors({ item, h }: { item: Item; h: Handlers }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-vaul-no-drag>
      <DateShortcutsPicker value={item.deadline ?? ''} onChange={(v) => h.onPatch(item.id, { deadline: v || null })} />
      <PriorityFlags value={item.prioriteit} onChange={(v) => h.onPatch(item.id, { prioriteit: v })} />
      <AssigneeDropdown value={item.assignees} team={TEAM} onToggle={(pid) => h.onAssign(item.id, pid)} />
    </div>
  )
}

const CHIP = 'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-xs text-secondary-foreground outline-none transition-colors hover:bg-bg-3'

/** Compacte prioriteit-chip die een popover met de vier vlaggen opent (Todoist-stijl). */
function PriorityChip({ value, onChange }: { value: TaskPriority; onChange: (v: TaskPriority) => void }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(CHIP, value === 'normaal' && 'text-fg-3')}>
        <PriorityGlyph p={value} size={13} />
        {value === 'normaal' ? 'Prioriteit' : PRIORITY_CONFIG[value].label}
      </PopoverTrigger>
      <PopoverContent align="start" className="pointer-events-auto w-auto p-1.5">
        <PriorityFlags value={value} onChange={(v) => { onChange(v); setOpen(false) }} />
      </PopoverContent>
    </Popover>
  )
}

/** Snel-toevoegen — input + de drie editors op één regel, Enter voegt toe. */
function QuickAdd({ onAdd, big }: { onAdd: (i: Omit<Item, 'id'>) => void; big?: boolean }) {
  const [titel, setTitel] = React.useState('')
  const [deadline, setDeadline] = React.useState('')
  const [prioriteit, setPrioriteit] = React.useState<TaskPriority>('normaal')
  const [assignees, setAssignees] = React.useState<string[]>([])
  function submit() {
    if (!titel.trim()) return
    onAdd({ titel: titel.trim(), notitie: null, done: false, deadline: deadline || null, prioriteit, assignees })
    setTitel(''); setDeadline(''); setPrioriteit('normaal'); setAssignees([])
  }
  const toggle = (id: string) => setAssignees((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))
  return (
    <div className={cn('flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-bg-2 px-3', big ? 'py-3' : 'py-2')} data-vaul-no-drag>
      <span className="grid size-[18px] shrink-0 place-content-center rounded-full border border-border-strong" />
      <input
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Nieuwe taak…"
        className={cn('min-w-[8rem] flex-1 bg-transparent text-fg-1 outline-none placeholder:text-fg-3', big ? 'text-[15px]' : 'text-[14px]')}
      />
      <div className="flex items-center gap-1.5">
        <DateShortcutsPicker value={deadline} onChange={setDeadline} />
        <PriorityChip value={prioriteit} onChange={setPrioriteit} />
        <AssigneeDropdown value={assignees} team={TEAM} onToggle={toggle} />
      </div>
    </div>
  )
}

function Title({ done, children }: { done: boolean; children: React.ReactNode }) {
  return <p className={cn('truncate text-[14px] leading-snug', done ? 'text-fg-3 line-through' : 'text-fg-1')}>{children}</p>
}

function DeleteBtn({ onClick, always }: { onClick: () => void; always?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      aria-label="Verwijderen"
      className={cn('shrink-0 text-fg-3 transition-opacity hover:text-fg-1', always ? '' : 'opacity-0 group-hover:opacity-100')}
    >
      <SvgIcon name="trash" size={14} />
    </button>
  )
}

// ── Compacte triggers (geen chip-styling): icoon als leeg, waarde als gevuld ──
function parseDate(v?: string): Date | undefined {
  if (!v) return undefined
  const [y, m, d] = v.split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d, 12) : undefined
}

// Horizontale inklap: leeg veld = 0 breed, klapt soepel open op hover (of als z'n
// popover open is). Gevulde velden blijven staan en lijnen rechts uit.
// Emil Kowalski: hover-effect dus snel (200ms), expliciete properties (geen `all`),
// sterke ease-out i.p.v. de slappe ingebouwde curve. Reduced-motion houdt de fade,
// laat de breedte-beweging vallen.
const EASE_OUT = 'ease-[cubic-bezier(0.23,1,0.32,1)]'
const slotWrap = (collapsed: boolean) =>
  cn(
    'grid transition-[grid-template-columns,opacity] duration-200 motion-reduce:transition-[opacity]',
    EASE_OUT,
    collapsed ? 'grid-cols-[0fr] opacity-0 group-hover:grid-cols-[1fr] group-hover:opacity-100' : 'grid-cols-[1fr] opacity-100',
  )

type MiniShared = { rowActive?: boolean; onOpenChange?: (o: boolean) => void }

function MiniDate({ value, onChange, rowActive, onOpenChange }: { value: string; onChange: (v: string) => void } & MiniShared) {
  const [open, setOpenRaw] = React.useState(false)
  const setOpen = (o: boolean) => { setOpenRaw(o); onOpenChange?.(o) }
  const pick = (v: string) => { onChange(v); setOpen(false) }
  const today = toLocalDateStr(new Date())
  const shortcuts = [
    { label: 'Vandaag', v: today },
    { label: 'Morgen', v: addDays(today, 1) },
    { label: 'Volgende week', v: addDays(today, 7) },
  ]
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span className={slotWrap(!value && !rowActive)}>
        <span className="overflow-hidden">
          <PopoverTrigger
            aria-label="Datum"
            className={cn('inline-flex items-center gap-1 whitespace-nowrap pl-3 text-[11px] outline-none transition-colors hover:text-fg-1', value ? 'text-fg-3' : 'text-fg-3/60')}
          >
            <SvgIcon name="calendar" size={value ? 11 : 13} />
            {value && dateLabel(value)}
          </PopoverTrigger>
        </span>
      </span>
      <PopoverContent align="end" className="pointer-events-auto w-auto gap-0 p-0">
        <div className="flex flex-col p-1.5">
          {shortcuts.map((s) => (
            <button key={s.label} onClick={() => pick(s.v)} className="flex items-center justify-between gap-6 rounded-md px-2.5 py-1.5 text-[13px] text-fg-1 hover:bg-bg-3">
              {s.label}<span className="text-[11px] text-fg-3">{dateLabel(s.v)}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-border-subtle">
          <Calendar mode="single" selected={parseDate(value)} defaultMonth={parseDate(value)} onSelect={(d) => d && pick(toLocalDateStr(d))} locale={nl} />
        </div>
        {value && (
          <button onClick={() => pick('')} className="w-full border-t border-border-subtle px-3 py-2 text-center text-xs text-fg-3 hover:text-fg-1">Wis datum</button>
        )}
      </PopoverContent>
    </Popover>
  )
}

function MiniPriority({ value, onChange, rowActive, onOpenChange }: { value: TaskPriority; onChange: (v: TaskPriority) => void } & MiniShared) {
  const [open, setOpenRaw] = React.useState(false)
  const setOpen = (o: boolean) => { setOpenRaw(o); onOpenChange?.(o) }
  const set = value !== 'normaal'
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span className={slotWrap(!set && !rowActive)}>
        <span className="overflow-hidden">
          <PopoverTrigger aria-label="Prioriteit" className="inline-flex pl-3 outline-none transition-opacity hover:opacity-100">
            <PriorityGlyph p={value} size={set ? 12 : 13} />
          </PopoverTrigger>
        </span>
      </span>
      <PopoverContent align="end" className="pointer-events-auto w-auto p-1.5">
        <PriorityFlags value={value} onChange={(v) => { onChange(v); setOpen(false) }} />
      </PopoverContent>
    </Popover>
  )
}

function MiniAssignee({ value, onToggle, rowActive, onOpenChange }: { value: string[]; onToggle: (id: string) => void } & MiniShared) {
  const [open, setOpenRaw] = React.useState(false)
  const setOpen = (o: boolean) => { setOpenRaw(o); onOpenChange?.(o) }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span className={slotWrap(value.length === 0 && !rowActive)}>
        <span className="overflow-hidden">
          <PopoverTrigger aria-label="Toewijzen" className={cn('inline-flex items-center whitespace-nowrap pl-3 outline-none transition-colors hover:text-fg-1', value.length ? 'text-fg-3' : 'text-fg-3/60')}>
            {value.length > 0 ? (
              <AvatarStack people={value.map((id) => ({ key: id, name: TEAM.find((t) => t.id === id)?.full_name, src: null }))} size={16} overlap={4} ringClass="ring-bg-1" />
            ) : (
              <SvgIcon name="user-plus" size={13} />
            )}
          </PopoverTrigger>
        </span>
      </span>
      <PopoverContent align="end" className="pointer-events-auto w-56 gap-0 p-1">
        {TEAM.map((t) => {
          const on = value.includes(t.id)
          return (
            <button key={t.id} type="button" onClick={() => onToggle(t.id)} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[13px] text-fg-1 transition-colors hover:bg-bg-3">
              <span className="flex items-center gap-2"><Avatar src={t.avatar_url} name={t.full_name} size={20} />{t.full_name}</span>
              {on && <SvgIcon name="check" size={14} className="text-fg-2" />}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

// ── Variant G · Hybrid (mini-icoon als leeg, kleine waarde als gevuld) ────────
function HybridRow({ t, h }: { t: Item; h: Handlers }) {
  // Houd de hele rij "open" zolang er ergens een picker openstaat — anders
  // verdwijnen de andere icoontjes zodra je de rij verlaat richting de popover.
  const [openCount, setOpenCount] = React.useState(0)
  const track = (o: boolean) => setOpenCount((c) => Math.max(0, c + (o ? 1 : -1)))
  const active = openCount > 0
  return (
    <div className="group flex items-center gap-2.5 py-2.5">
      <Check done={t.done} onToggle={() => h.onToggle(t.id)} />
      <span className="min-w-0 flex-1"><Title done={t.done}>{t.titel}</Title></span>
      <div className="flex shrink-0 items-center justify-end">
        <MiniDate value={t.deadline ?? ''} onChange={(v) => h.onPatch(t.id, { deadline: v || null })} rowActive={active} onOpenChange={track} />
        <MiniPriority value={t.prioriteit} onChange={(v) => h.onPatch(t.id, { prioriteit: v })} rowActive={active} onOpenChange={track} />
        <MiniAssignee value={t.assignees} onToggle={(pid) => h.onAssign(t.id, pid)} rowActive={active} onOpenChange={track} />
      </div>
      <DeleteBtn onClick={() => h.onDelete(t.id)} />
    </div>
  )
}

function VariantHybrid({ items, h }: { items: Item[]; h: Handlers }) {
  return (
    <div className="divide-y divide-border-subtle/60">
      {items.map((t) => <HybridRow key={t.id} t={t} h={h} />)}
    </div>
  )
}

// ── Variant A · Inline chips (Todoist) ───────────────────────────────────────
function VariantInline({ items, h }: { items: Item[]; h: Handlers }) {
  return (
    <div className="divide-y divide-border-subtle/60">
      {items.map((t) => (
        <div key={t.id} className="group flex items-center gap-2.5 py-2">
          <Check done={t.done} onToggle={() => h.onToggle(t.id)} />
          <div className="min-w-0 flex-1"><Title done={t.done}>{t.titel}</Title></div>
          <div className="flex shrink-0 items-center gap-1.5">
            <DateShortcutsPicker value={t.deadline ?? ''} onChange={(v) => h.onPatch(t.id, { deadline: v || null })} />
            <PriorityChip value={t.prioriteit} onChange={(v) => h.onPatch(t.id, { prioriteit: v })} />
            <AssigneeDropdown value={t.assignees} team={TEAM} onToggle={(pid) => h.onAssign(t.id, pid)} />
          </div>
          <DeleteBtn onClick={() => h.onDelete(t.id)} />
        </div>
      ))}
    </div>
  )
}

// ── Variant B · Stille rij + detail-popover ──────────────────────────────────
function VariantPopover({ items, h }: { items: Item[]; h: Handlers }) {
  return (
    <div className="divide-y divide-border-subtle/60">
      {items.map((t) => (
        <Popover key={t.id}>
          <div className="group flex items-center gap-2.5 py-2.5">
            <Check done={t.done} onToggle={() => h.onToggle(t.id)} />
            <PopoverTrigger className="flex min-w-0 flex-1 items-center gap-2.5 text-left outline-none">
              <span className="min-w-0 flex-1"><Title done={t.done}>{t.titel}</Title></span>
              <ReadMeta item={t} />
            </PopoverTrigger>
            <DeleteBtn onClick={() => h.onDelete(t.id)} />
          </div>
          <PopoverContent align="end" className="pointer-events-auto w-72 gap-0 p-3">
            <input
              defaultValue={t.titel}
              onBlur={(e) => h.onPatch(t.id, { titel: e.target.value })}
              className="mb-3 w-full bg-transparent text-[14px] font-medium text-fg-1 outline-none"
            />
            <div className="flex flex-col gap-2">
              <DateShortcutsPicker value={t.deadline ?? ''} onChange={(v) => h.onPatch(t.id, { deadline: v || null })} />
              <PriorityFlags value={t.prioriteit} onChange={(v) => h.onPatch(t.id, { prioriteit: v })} />
              <AssigneeDropdown value={t.assignees} team={TEAM} onToggle={(pid) => h.onAssign(t.id, pid)} />
            </div>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  )
}

// ── Variant C · Post-it snelinvoer (meta altijd zichtbaar onder titel) ────────
function VariantPostit({ items, h }: { items: Item[]; h: Handlers }) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((t) => (
        <div key={t.id} className="group flex items-start gap-2.5 rounded-lg bg-bg-2 px-3 py-2.5">
          <span className="mt-0.5"><Check done={t.done} onToggle={() => h.onToggle(t.id)} /></span>
          <div className="min-w-0 flex-1">
            <Title done={t.done}>{t.titel}</Title>
            {t.notitie && <p className="truncate text-[12px] leading-snug text-fg-2">{t.notitie}</p>}
            <div className="mt-1.5"><Editors item={t} h={h} /></div>
          </div>
          <DeleteBtn onClick={() => h.onDelete(t.id)} />
        </div>
      ))}
    </div>
  )
}

// ── Variant D · Klik-om-uit-te-klappen ───────────────────────────────────────
function VariantExpand({ items, h }: { items: Item[]; h: Handlers }) {
  const [openId, setOpenId] = React.useState<string | null>(null)
  return (
    <div className="divide-y divide-border-subtle/60">
      {items.map((t) => {
        const open = openId === t.id
        return (
          <div key={t.id} className="group">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setOpenId(open ? null : t.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpenId(open ? null : t.id)}
              className="flex w-full cursor-pointer items-center gap-2.5 py-2.5 text-left outline-none"
            >
              <Check done={t.done} onToggle={() => h.onToggle(t.id)} />
              <span className="min-w-0 flex-1"><Title done={t.done}>{t.titel}</Title></span>
              {!open && <ReadMeta item={t} />}
              <SvgIcon name="chevron-down" size={14} className={cn('shrink-0 text-fg-3 transition-transform duration-200', EASE_OUT, open && 'rotate-180')} />
            </div>
            <div className={cn('grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-[opacity]', EASE_OUT, open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
              <div className="overflow-hidden">
                <div className="pb-3 pl-[28px]"><Editors item={t} h={h} /></div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Variant E · Trailing reserved (huidige aanpak, maar zonder verspringen) ───
function VariantTrailing({ items, h }: { items: Item[]; h: Handlers }) {
  return (
    <div className="divide-y divide-border-subtle/60">
      {items.map((t) => (
        <div key={t.id} className="group flex items-center gap-2.5 py-2.5">
          <Check done={t.done} onToggle={() => h.onToggle(t.id)} />
          <span className="min-w-0 flex-1"><Title done={t.done}>{t.titel}</Title></span>
          <ReadMeta item={t} />
          {/* Vaste-breedte slot: alleen opacity wisselt, dus geen layout-shift */}
          <Popover>
            <PopoverTrigger
              aria-label="Bewerken"
              className="grid size-7 shrink-0 place-content-center rounded-full text-fg-3 opacity-0 outline-none transition-opacity hover:bg-bg-3 hover:text-fg-1 group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <SvgIcon name="ellipsis" size={16} />
            </PopoverTrigger>
            <PopoverContent align="end" className="pointer-events-auto w-72 gap-0 p-3">
              <div className="flex flex-col gap-2">
                <DateShortcutsPicker value={t.deadline ?? ''} onChange={(v) => h.onPatch(t.id, { deadline: v || null })} />
                <PriorityFlags value={t.prioriteit} onChange={(v) => h.onPatch(t.id, { prioriteit: v })} />
                <AssigneeDropdown value={t.assignees} team={TEAM} onToggle={(pid) => h.onAssign(t.id, pid)} />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ))}
    </div>
  )
}

// ── Variant F · Post-it kaarten ──────────────────────────────────────────────
function VariantCards({ items, h }: { items: Item[]; h: Handlers }) {
  return (
    <div className="grid gap-2">
      {items.map((t) => (
        <div key={t.id} className="group rounded-xl border border-border-subtle bg-bg-2 p-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5"><Check done={t.done} onToggle={() => h.onToggle(t.id)} /></span>
            <span className="min-w-0 flex-1"><Title done={t.done}>{t.titel}</Title></span>
            <DeleteBtn onClick={() => h.onDelete(t.id)} />
          </div>
          <div className="mt-2 pl-[28px]"><Editors item={t} h={h} /></div>
        </div>
      ))}
    </div>
  )
}

// ── Pagina ───────────────────────────────────────────────────────────────────
type VariantKey = 'hybrid' | 'inline' | 'popover' | 'postit' | 'expand' | 'trailing' | 'cards'
const VARIANTS: { key: VariantKey; label: string; hint: string; Comp: React.ComponentType<{ items: Item[]; h: Handlers }>; bigAdd?: boolean }[] = [
  { key: 'hybrid', label: 'G · Hybrid', hint: 'Leeg = klein klikbaar icoontje, gevuld = de kleine waarde. Geen chip-styling, vaste plek, niks verspringt.', Comp: VariantHybrid },
  { key: 'inline', label: 'A · Inline chips', hint: 'Meta altijd zichtbaar als chips rechts. Niks verspringt; klik een chip om te wijzigen.', Comp: VariantInline },
  { key: 'popover', label: 'B · Detail-popover', hint: 'Rustige rij; klik opent een popover-paneel met alle velden. De lijst beweegt nooit.', Comp: VariantPopover },
  { key: 'postit', label: 'C · Post-it', hint: 'Snel typen; meta altijd zichtbaar onder de titel op vaste plek.', Comp: VariantPostit, bigAdd: true },
  { key: 'expand', label: 'D · Uitklappen', hint: 'Klik klapt de rij uit naar bewerk-stand met soepele hoogte-animatie.', Comp: VariantExpand },
  { key: 'trailing', label: 'E · Trailing', hint: 'Huidige stijl, maar het edit-slot is vaste breedte (alleen opacity wisselt).', Comp: VariantTrailing },
  { key: 'cards', label: 'F · Kaarten', hint: 'Elke taak een post-it-kaart met meta in de voet. Rustig, niets wisselt.', Comp: VariantCards },
]

export default function TodoPrototype() {
  const [variant, setVariant] = React.useState<VariantKey>('hybrid')
  const [items, setItems] = React.useState<Item[]>(INITIAL)

  const h: Handlers = {
    onToggle: (id) => setItems((v) => v.map((t) => (t.id === id ? { ...t, done: !t.done } : t))),
    onPatch: (id, p) => setItems((v) => v.map((t) => (t.id === id ? { ...t, ...p } : t))),
    onAssign: (id, pid) => setItems((v) => v.map((t) => (t.id === id ? { ...t, assignees: t.assignees.includes(pid) ? t.assignees.filter((x) => x !== pid) : [...t.assignees, pid] } : t))),
    onDelete: (id) => setItems((v) => v.filter((t) => t.id !== id)),
  }
  const onAdd = (i: Omit<Item, 'id'>) => setItems((v) => [...v, { ...i, id: `t${Date.now()}` }])

  const active = VARIANTS.find((v) => v.key === variant)!

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 flex-col gap-6 p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-fg-1">Taken-drawer · prototypes</h1>
          <p className="text-sm text-fg-3">Zelfde lijst, zes interactie-modellen. Alles werkt: afvinken, datum, prioriteit, teamlid toewijzen en toevoegen. Niks verspringt.</p>
        </header>

        <div className="flex flex-col gap-2">
          <div className="inline-flex w-fit flex-wrap gap-1 rounded-lg bg-muted/40 p-1">
            {VARIANTS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setVariant(v.key)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  variant === v.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <p className="pl-1 text-xs text-fg-3">{active.hint}</p>
        </div>
      </div>

      {/* Drawer-frame */}
      <aside className="sticky top-0 flex h-screen w-[460px] shrink-0 flex-col border-l border-border-subtle bg-bg-1">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <span className="text-[13px] font-medium text-fg-1">Mijn taken</span>
          <SvgIcon name="x" size={16} className="text-fg-3" />
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <QuickAdd onAdd={onAdd} big={active.bigAdd} />
          <active.Comp items={items} h={h} />
        </div>
      </aside>
    </div>
  )
}
