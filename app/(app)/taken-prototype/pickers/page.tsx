'use client'

// ponytail: throwaway prototype — drie varianten per picker (datum / prioriteit /
// teamlid) om de interactie te kiezen. Mock-state, geen data-wiring.

import * as React from 'react'
import { nl } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { fmtDate, addDays, toLocalDateStr } from '@/lib/dates'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { Calendar } from '@/components/ui/calendar'
import { DatePicker } from '@/components/ui/DatePicker'
import { PillSelect } from '@/components/ui/PillSelect'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/DropdownMenu'
import { PRIORITY_CONFIG, PRIORITY_ICON, type TaskPriority } from '@/types/project'

const TEAM = [
  { id: '1', full_name: 'Jordi Klavers' },
  { id: '2', full_name: 'Sam de Vries' },
  { id: '3', full_name: 'Noa Jansen' },
  { id: '4', full_name: 'Tess Bakker' },
]

const PRIOS: TaskPriority[] = ['laag', 'normaal', 'hoog', 'urgent']

const PILL =
  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-xs text-secondary-foreground outline-none transition-colors hover:bg-bg-3 aria-expanded:bg-bg-3 data-[popup-open]:bg-bg-3'

function parseValue(v?: string): Date | undefined {
  if (!v) return undefined
  const [y, m, d] = v.split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d, 12) : undefined
}

const today = () => toLocalDateStr(new Date())
const dateLabel = (v: string) => fmtDate(v, { weekday: 'short', day: 'numeric', month: 'short' })

// ─── Layout-helpers ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-[15px] font-medium text-fg-1">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{children}</div>
    </section>
  )
}

function Variant({ label, hint, value, children }: { label: string; hint: string; value: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-2 p-4">
      <div>
        <p className="text-[13px] font-medium text-fg-1">{label}</p>
        <p className="text-[12px] leading-snug text-fg-3">{hint}</p>
      </div>
      <div className="flex min-h-7 items-center">{children}</div>
      <p className="mt-auto text-[11px] text-fg-3">
        Gekozen: <span className="text-fg-2">{value || '—'}</span>
      </p>
    </div>
  )
}

// ─── DATUM ────────────────────────────────────────────────────────────────────

/** D2 — snelkoppelingen + kalender in een popover. */
function DateShortcuts({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
        {value ? dateLabel(value) : 'Datum'}
      </PopoverTrigger>
      <PopoverContent align="start" className="pointer-events-auto w-auto gap-0 p-0">
        <div className="flex flex-col p-1.5">
          {shortcuts.map((s) => (
            <button
              key={s.label}
              onClick={() => pick(s.v)}
              className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] text-fg-1 hover:bg-bg-3"
            >
              {s.label}
              <span className="text-[11px] text-fg-3">{dateLabel(s.v)}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-border-subtle">
          <Calendar mode="single" selected={parseValue(value)} defaultMonth={parseValue(value)} onSelect={(d) => d && pick(toLocalDateStr(d))} locale={nl} />
        </div>
        {value && (
          <button onClick={() => pick('')} className="w-full border-t border-border-subtle px-3 py-2 text-center text-xs text-fg-3 hover:text-fg-1">
            Wis datum
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** D3 — native date-input als pill. OS-kalender, werkt overal incl. mobiel. */
function DateNative({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className={cn(PILL, 'relative', !value && 'text-fg-3')}>
      <SvgIcon name="calendar" size={12} />
      {value ? dateLabel(value) : 'Datum'}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Datum kiezen"
      />
    </label>
  )
}

// ─── PRIORITEIT ────────────────────────────────────────────────────────────────

function PrioGlyph({ p, size = 13 }: { p: TaskPriority; size?: number }) {
  return (
    <span className="inline-flex" style={{ color: PRIORITY_CONFIG[p].color }}>
      <SvgIcon name={PRIORITY_ICON[p]} size={size} />
    </span>
  )
}

/** P2 — dropdown met gekleurde iconen + vinkje op de actieve. */
function PrioDropdown({ value, onChange }: { value: TaskPriority; onChange: (v: TaskPriority) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={PILL}>
        <PrioGlyph p={value} />
        {PRIORITY_CONFIG[value].label}
        <SvgIcon name="caret-down" size={10} className="text-fg-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {PRIOS.map((p) => (
          <DropdownMenuItem key={p} onSelect={() => onChange(p)} className="justify-between">
            <span className="flex items-center gap-2">
              <PrioGlyph p={p} />
              {PRIORITY_CONFIG[p].label}
            </span>
            {value === p && <SvgIcon name="check" size={14} className="text-fg-2" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** P3 — inline flags: vier knoppen, één tik om te zetten. */
function PrioFlags({ value, onChange }: { value: TaskPriority; onChange: (v: TaskPriority) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary p-0.5">
      {PRIOS.map((p) => {
        const active = value === p
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-label={PRIORITY_CONFIG[p].label}
            title={PRIORITY_CONFIG[p].label}
            className={cn(
              'grid size-6 place-content-center rounded-full transition-colors',
              active ? '' : 'opacity-40 hover:opacity-100',
            )}
            style={active ? { background: PRIORITY_CONFIG[p].bg } : undefined}
          >
            <PrioGlyph p={p} size={14} />
          </button>
        )
      })}
    </div>
  )
}

// ─── TEAMLID ────────────────────────────────────────────────────────────────────

const names = (ids: string[]) => TEAM.filter((t) => ids.includes(t.id)).map((t) => t.full_name).join(', ')

/** T2 — dropdown met avatars, multi-select (vinkjes, blijft open). */
function TeamDropdown({ value, onToggle }: { value: string[]; onToggle: (id: string) => void }) {
  const toggle = onToggle
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(PILL, value.length === 0 && 'text-fg-3')}>
        {value.length > 0 ? (
          <AvatarStack people={value.map((id) => ({ key: id, name: TEAM.find((t) => t.id === id)?.full_name }))} size={16} overlap={5} ringClass="ring-secondary" />
        ) : (
          <SvgIcon name="user-plus" size={12} />
        )}
        {value.length > 0 ? `${value.length} toegewezen` : 'Toewijzen'}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        {TEAM.map((t) => {
          const on = value.includes(t.id)
          return (
            <DropdownMenuItem key={t.id} onSelect={(e) => { e.preventDefault(); toggle(t.id) }} className="justify-between">
              <span className="flex items-center gap-2">
                <Avatar name={t.full_name} size={20} />
                {t.full_name}
              </span>
              {on && <SvgIcon name="check" size={14} className="text-fg-2" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** T3 — avatar-rij: tik om toe te wijzen. Snelst bij een klein team. */
function TeamAvatars({ value, onToggle }: { value: string[]; onToggle: (id: string) => void }) {
  const toggle = onToggle
  return (
    <div className="flex items-center gap-1.5">
      {TEAM.map((t) => {
        const on = value.includes(t.id)
        return (
          <button
            key={t.id}
            onClick={() => toggle(t.id)}
            aria-label={t.full_name}
            aria-pressed={on}
            title={t.full_name}
            className={cn('rounded-full transition-all', on ? 'ring-2 ring-fg-1' : 'opacity-45 hover:opacity-100')}
          >
            <Avatar name={t.full_name} size={26} />
          </button>
        )
      })}
    </div>
  )
}

// ─── Pagina ─────────────────────────────────────────────────────────────────

export default function PickersPrototypePage() {
  const [dA, setDA] = React.useState('')
  const [dB, setDB] = React.useState('')
  const [dC, setDC] = React.useState('')
  const [pA, setPA] = React.useState<TaskPriority>('normaal')
  const [pB, setPB] = React.useState<TaskPriority>('normaal')
  const [pC, setPC] = React.useState<TaskPriority>('normaal')
  const [tA, setTA] = React.useState('')
  const [tB, setTB] = React.useState<string[]>([])
  const [tC, setTC] = React.useState<string[]>([])

  const toggle = (set: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
    set((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-10">
        <header className="mb-10">
          <h1 className="text-[24px] font-medium tracking-tight text-fg-1">Pickers — prototype</h1>
          <p className="mt-1 text-[13px] text-fg-2">Drie varianten per picker. Allemaal live — speel ermee en kies.</p>
        </header>

        <div className="flex flex-col gap-12">
          <Section title="Datum">
            <Variant label="D1 — Kalender-popover" hint="De bestaande DatePicker. Eén klik → maandkalender." value={dA ? dateLabel(dA) : ''}>
              <DatePicker variant="pill" value={dA} onChange={setDA} placeholder="Datum" />
            </Variant>
            <Variant label="D2 — Snelkoppelingen + kalender" hint="Vandaag / morgen / volgende week bovenaan, kalender eronder." value={dB ? dateLabel(dB) : ''}>
              <DateShortcuts value={dB} onChange={setDB} />
            </Variant>
            <Variant label="D3 — Native date-input" hint="OS-kalender. Laziest, werkt overal incl. mobiel." value={dC ? dateLabel(dC) : ''}>
              <DateNative value={dC} onChange={setDC} />
            </Variant>
          </Section>

          <Section title="Prioriteit">
            <Variant label="P1 — Native select (PillSelect)" hint="Bestaand atoom. Compact, OS-menu, veilig in drawers." value={PRIORITY_CONFIG[pA].label}>
              <PillSelect icon={PRIORITY_ICON[pA]} value={pA} onChange={(v) => setPA(v as TaskPriority)}>
                {PRIOS.map((p) => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
              </PillSelect>
            </Variant>
            <Variant label="P2 — Dropdown met kleur-iconen" hint="Toont de signaal-iconen in kleur + vinkje. Meest leesbaar." value={PRIORITY_CONFIG[pB].label}>
              <PrioDropdown value={pB} onChange={setPB} />
            </Variant>
            <Variant label="P3 — Inline flags" hint="Vier knoppen, één tik om te zetten. Geen menu." value={PRIORITY_CONFIG[pC].label}>
              <PrioFlags value={pC} onChange={setPC} />
            </Variant>
          </Section>

          <Section title="Teamlid">
            <Variant label="T1 — Native select (één persoon)" hint="Bestaand atoom. Eén toegewezene." value={tA ? names([tA]) : ''}>
              <PillSelect icon="user-plus" value={tA} onChange={setTA}>
                <option value="">Niemand</option>
                {TEAM.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </PillSelect>
            </Variant>
            <Variant label="T2 — Dropdown met avatars (meerdere)" hint="Vinkjes, blijft open. Voor meerdere toegewezenen." value={names(tB)}>
              <TeamDropdown value={tB} onToggle={toggle(setTB)} />
            </Variant>
            <Variant label="T3 — Avatar-rij toggle" hint="Tik op een avatar. Snelst bij een klein team." value={names(tC)}>
              <TeamAvatars value={tC} onToggle={toggle(setTC)} />
            </Variant>
          </Section>
        </div>
      </div>
    </div>
  )
}
