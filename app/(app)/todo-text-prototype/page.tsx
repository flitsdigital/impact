'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { fmtDate } from '@/lib/dates'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Avatar } from '@/components/ui/Avatar'
import { PriorityGlyph } from '@/components/todos/PriorityFlags'
import type { TaskPriority } from '@/types/project'

// ponytail: prototype-pagina om te voelen hoe lange taaktekst getoond wordt.
// Statische meta — focus ligt op de titel-weergave. Geen shared component tot er
// een winnaar is.

type Row = { id: string; titel: string; done: boolean; deadline: string | null; prio: TaskPriority; assignee: string | null }

const ROWS: Row[] = [
  { id: '1', titel: 'Groenmaat naar FC Emmen', done: false, deadline: '2026-06-18', prio: 'urgent', assignee: null },
  { id: '2', titel: 'Drie opzetjes voor thema sturen naar PrivateFun en daarna de feedback verwerken voor volgende week', done: false, deadline: '2026-06-25', prio: 'normaal', assignee: null },
  { id: '3', titel: 'WIKO Dakkapellen table of contents herstructureren en doorlinken naar de nieuwe productpagina’s', done: false, deadline: '2026-06-18', prio: 'hoog', assignee: 'Sam Lee' },
  { id: '4', titel: 'Nieuwe website maken inclusief alle landingspagina’s, blog-structuur en de migratie van de oude content naar het nieuwe CMS', done: false, deadline: '2026-06-06', prio: 'normaal', assignee: 'Jordi Klavers' },
  { id: '5', titel: 'PrivateFun bellen', done: false, deadline: '2026-06-18', prio: 'laag', assignee: 'Mees Peters' },
]

const dateLabel = (v: string) => fmtDate(v, { day: 'numeric', month: 'short' })

function Check({ done }: { done: boolean }) {
  return (
    <span className={cn('grid size-5 shrink-0 place-content-center rounded-full border', done ? 'border-green-500 bg-green-500/15 text-green-500' : 'border-border-strong text-transparent')}>
      <SvgIcon name="check" size={11} />
    </span>
  )
}

function Meta({ t, className }: { t: Row; className?: string }) {
  return (
    <div className={cn('flex shrink-0 items-center gap-3 text-fg-3', className)}>
      {t.deadline && <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs"><SvgIcon name="calendar" size={16} />{dateLabel(t.deadline)}</span>}
      {t.prio !== 'normaal' && <PriorityGlyph p={t.prio} size={16} />}
      {t.assignee ? <Avatar name={t.assignee} size={20} /> : <SvgIcon name="user-plus" size={16} className="opacity-60" />}
    </div>
  )
}

const titleCls = (done: boolean) => cn('text-[13px] leading-snug', done ? 'text-fg-3 line-through' : 'text-fg-1')

// 1 — Volledig wrappen
function VWrap({ rows }: { rows: Row[] }) {
  return (
    <List>{rows.map((t) => (
      <div key={t.id} className="flex items-start gap-2.5 py-2.5">
        <span className="mt-0.5"><Check done={t.done} /></span>
        <p className={cn('min-w-0 flex-1', titleCls(t.done))}>{t.titel}</p>
        <Meta t={t} className="mt-0.5" />
      </div>
    ))}</List>
  )
}

// 2 — Max 2 regels (line-clamp)
function VClamp({ rows }: { rows: Row[] }) {
  return (
    <List>{rows.map((t) => (
      <div key={t.id} className="flex items-start gap-2.5 py-2.5">
        <span className="mt-0.5"><Check done={t.done} /></span>
        <p className={cn('line-clamp-2 min-w-0 flex-1', titleCls(t.done))}>{t.titel}</p>
        <Meta t={t} className="mt-0.5" />
      </div>
    ))}</List>
  )
}

// 3 — Eén regel + native tooltip op hover
function VTooltip({ rows }: { rows: Row[] }) {
  return (
    <List>{rows.map((t) => (
      <div key={t.id} className="flex items-center gap-2.5 py-2.5">
        <Check done={t.done} />
        <p title={t.titel} className={cn('min-w-0 flex-1 cursor-default truncate', titleCls(t.done))}>{t.titel}</p>
        <Meta t={t} />
      </div>
    ))}</List>
  )
}

// 4 — Klik klapt volledige tekst uit
function VClick({ rows }: { rows: Row[] }) {
  const [open, setOpen] = React.useState<string | null>(null)
  return (
    <List>{rows.map((t) => {
      const ex = open === t.id
      return (
        <div key={t.id} className="flex items-start gap-2.5 py-2.5">
          <span className="mt-0.5"><Check done={t.done} /></span>
          <button onClick={() => setOpen(ex ? null : t.id)} className={cn('min-w-0 flex-1 text-left outline-none', !ex && 'truncate', titleCls(t.done))}>{t.titel}</button>
          <Meta t={t} className="mt-0.5" />
        </div>
      )
    })}</List>
  )
}

// 5 — Wrapt alleen bij hover (rij groeit)
function VHoverGrow({ rows }: { rows: Row[] }) {
  return (
    <List>{rows.map((t) => (
      <div key={t.id} className="group flex items-start gap-2.5 py-2.5">
        <span className="mt-0.5"><Check done={t.done} /></span>
        <p className={cn('min-w-0 flex-1 truncate transition-all group-hover:whitespace-normal', titleCls(t.done))}>{t.titel}</p>
        <Meta t={t} className="mt-0.5" />
      </div>
    ))}</List>
  )
}

// 6 — Fade-out i.p.v. ellipsis
function VFade({ rows }: { rows: Row[] }) {
  return (
    <List>{rows.map((t) => (
      <div key={t.id} className="flex items-center gap-2.5 py-2.5">
        <Check done={t.done} />
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className={cn('whitespace-nowrap', titleCls(t.done))} style={{ maskImage: 'linear-gradient(to right, #000 78%, transparent)', WebkitMaskImage: 'linear-gradient(to right, #000 78%, transparent)' }}>{t.titel}</p>
        </div>
        <Meta t={t} />
      </div>
    ))}</List>
  )
}

// 7 — Titel full-width, meta vloeit erachter
function VInlineMeta({ rows }: { rows: Row[] }) {
  return (
    <List>{rows.map((t) => (
      <div key={t.id} className="flex items-start gap-2.5 py-2.5">
        <span className="mt-0.5"><Check done={t.done} /></span>
        <p className={cn('min-w-0 flex-1', titleCls(t.done))}>
          {t.titel}
          <span className="ml-2 inline-flex translate-y-0.5 items-center gap-2 align-middle text-fg-3">
            {t.deadline && <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs"><SvgIcon name="calendar" size={14} />{dateLabel(t.deadline)}</span>}
            {t.prio !== 'normaal' && <PriorityGlyph p={t.prio} size={14} />}
          </span>
        </p>
      </div>
    ))}</List>
  )
}

// 8 — Titel wrapt, meta op eigen regel eronder
function VStacked({ rows }: { rows: Row[] }) {
  return (
    <List>{rows.map((t) => (
      <div key={t.id} className="flex items-start gap-2.5 py-2.5">
        <span className="mt-0.5"><Check done={t.done} /></span>
        <div className="min-w-0 flex-1">
          <p className={titleCls(t.done)}>{t.titel}</p>
          <Meta t={t} className="mt-1.5" />
        </div>
      </div>
    ))}</List>
  )
}

// 9 — Detail-popover op klik
function VPopover({ rows }: { rows: Row[] }) {
  const [open, setOpen] = React.useState<string | null>(null)
  return (
    <List>{rows.map((t) => (
      <div key={t.id} className="relative flex items-center gap-2.5 py-2.5">
        <Check done={t.done} />
        <button onClick={() => setOpen(open === t.id ? null : t.id)} className={cn('min-w-0 flex-1 truncate text-left outline-none', titleCls(t.done))}>{t.titel}</button>
        <Meta t={t} />
        {open === t.id && (
          <div className="absolute left-7 right-2 top-full z-10 mt-1 rounded-lg border border-border-subtle bg-bg-2 p-3 shadow-lg">
            <p className={cn('text-[13px] leading-relaxed', t.done && 'text-fg-3 line-through')}>{t.titel}</p>
          </div>
        )}
      </div>
    ))}</List>
  )
}

// 10 — Marquee op hover
function VMarquee({ rows }: { rows: Row[] }) {
  return (
    <>
      <style>{'@keyframes todomarquee{0%,15%{transform:translateX(0)}85%,100%{transform:translateX(calc(-100% + 12rem))}}'}</style>
      <List>{rows.map((t) => (
        <div key={t.id} className="group flex items-center gap-2.5 py-2.5">
          <Check done={t.done} />
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className={cn('inline-block whitespace-nowrap will-change-transform group-hover:[animation:todomarquee_4s_linear_infinite]', titleCls(t.done))}>{t.titel}</p>
          </div>
          <Meta t={t} />
        </div>
      ))}</List>
    </>
  )
}

function List({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-border-subtle/60">{children}</div>
}

type Key = string
const VARIANTS: { key: Key; label: string; hint: string; Comp: React.ComponentType<{ rows: Row[] }> }[] = [
  { key: '1', label: '1 · Wrappen', hint: 'Titel wrapt volledig over meerdere regels; meta lijnt bovenaan uit.', Comp: VWrap },
  { key: '2', label: '2 · Max 2 regels', hint: 'line-clamp: maximaal 2 regels, daarna ellipsis.', Comp: VClamp },
  { key: '3', label: '3 · Tooltip', hint: 'Eén regel + ellipsis; volledige tekst als native tooltip op hover.', Comp: VTooltip },
  { key: '4', label: '4 · Klik uitklappen', hint: 'Eén regel; klik op de titel toont de volledige tekst.', Comp: VClick },
  { key: '5', label: '5 · Hover groeit', hint: 'Eén regel; bij hover wrapt de rij open naar de volledige tekst.', Comp: VHoverGrow },
  { key: '6', label: '6 · Fade-out', hint: 'Eén regel die naar rechts uitvaagt i.p.v. een harde "…".', Comp: VFade },
  { key: '7', label: '7 · Meta erachter', hint: 'Titel full-width en wrapt; datum/prioriteit vloeien achter de tekst.', Comp: VInlineMeta },
  { key: '8', label: '8 · Meta eronder', hint: 'Titel wrapt full-width; meta op een eigen regel eronder.', Comp: VStacked },
  { key: '9', label: '9 · Detail-popover', hint: 'Eén regel; klik opent een paneel met de volledige tekst.', Comp: VPopover },
  { key: '10', label: '10 · Marquee', hint: 'Eén regel; tekst scrolt horizontaal op hover.', Comp: VMarquee },
]

export default function TodoTextPrototype() {
  const [key, setKey] = React.useState<Key>('1')
  const active = VARIANTS.find((v) => v.key === key)!
  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 flex-col gap-6 p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-fg-1">Lange taaktekst · prototypes</h1>
          <p className="text-sm text-fg-3">Tien manieren om de volledige tekst van een taak te tonen. Zelfde lijst met een paar bewust lange titels.</p>
        </header>
        <div className="flex flex-col gap-2">
          <div className="inline-flex w-fit flex-wrap gap-1 rounded-lg bg-muted/40 p-1">
            {VARIANTS.map((v) => (
              <button key={v.key} type="button" onClick={() => setKey(v.key)}
                className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-all', key === v.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {v.label}
              </button>
            ))}
          </div>
          <p className="pl-1 text-xs text-fg-3">{active.hint}</p>
        </div>
      </div>

      <aside className="sticky top-0 flex h-screen w-[460px] shrink-0 flex-col border-l border-border-subtle bg-bg-1">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <span className="text-[13px] font-medium text-fg-1">Mijn taken</span>
          <SvgIcon name="x" size={16} className="text-fg-3" />
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <active.Comp rows={ROWS} />
        </div>
      </aside>
    </div>
  )
}
