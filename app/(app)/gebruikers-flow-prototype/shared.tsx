'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'

// ponytail: gedeelde mockdata + bouwstenen voor de uitnodig-flow prototypes.
// Alles in-memory, geen DB. Verhuist pas naar productie als er per onderdeel een winnaar is.

export const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]'

export type RoleId = 'beheerder' | 'lid' | 'lezer'
export const ROLES: { id: RoleId; label: string; hint: string; tint: string }[] = [
  { id: 'beheerder', label: 'Beheerder', hint: 'Volledige toegang + beheer van gebruikers', tint: 'text-purple-500' },
  { id: 'lid', label: 'Lid', hint: 'Werkt mee aan klanten & content', tint: 'text-blue-500' },
  { id: 'lezer', label: 'Alleen lezen', hint: 'Bekijkt alles, wijzigt niets', tint: 'text-fg-2' },
]
export const roleOf = (id: RoleId) => ROLES.find((r) => r.id === id)!

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

export type UserStatus = 'actief' | 'uitgenodigd' | 'inactief'
export const STATUS: Record<UserStatus, { label: string; icon: string; tint: string }> = {
  actief: { label: 'Actief', icon: 'badge-check', tint: 'text-green-500' },
  uitgenodigd: { label: 'Uitgenodigd', icon: 'user-clock', tint: 'text-orange-500' },
  inactief: { label: 'Inactief', icon: 'circle-pause', tint: 'text-fg-3' },
}

export type User = {
  id: string
  name: string
  email: string
  role: RoleId
  status: UserStatus
  lastActive: string // mensgelezen
}

export const TEAM: User[] = [
  { id: 'u1', name: 'Jordi Klavers', email: 'jordi@flits.nl', role: 'beheerder', status: 'actief', lastActive: 'nu' },
  { id: 'u2', name: 'Sam Lee', email: 'sam@flits.nl', role: 'lid', status: 'actief', lastActive: '2 uur geleden' },
  { id: 'u3', name: 'Mees Peters', email: 'mees@flits.nl', role: 'lid', status: 'actief', lastActive: 'gisteren' },
  { id: 'u4', name: 'Noa de Vries', email: 'noa@bureau.nl', role: 'lezer', status: 'uitgenodigd', lastActive: '—' },
  { id: 'u5', name: 'Tim Bakker', email: 'tim@flits.nl', role: 'lid', status: 'inactief', lastActive: '3 maanden geleden' },
]

// ── Bouwstenen ───────────────────────────────────────────────────────────────
export function RolePills({ value, onChange }: { value: RoleId; onChange: (r: RoleId) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ROLES.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={cn(
            'rounded-full border px-2.5 py-1 text-[12px] transition-colors',
            EASE,
            value === r.id ? 'border-border-strong bg-bg-3 text-fg-1' : 'border-border-subtle text-fg-2 hover:text-fg-1',
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

export function StatusBadge({ status }: { status: UserStatus }) {
  const s = STATUS[status]
  return (
    <span className={cn('inline-flex items-center gap-1 text-[12px]', s.tint)}>
      <SvgIcon name={s.icon} size={13} />
      {s.label}
    </span>
  )
}

// Inline rol-dropdown zonder portal (vermijdt base-ui-in-overlay gedoe). ponytail: eigen 30 regels.
export function RoleSelect({ value, onChange }: { value: RoleId; onChange: (r: RoleId) => void }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn('inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-[12px] transition-colors hover:border-border-strong', roleOf(value).tint)}
      >
        {roleOf(value).label}
        <SvgIcon name="chevron-down" size={12} className="text-fg-3" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-44 overflow-hidden rounded-lg border border-border-subtle bg-bg-2 p-1 shadow-lg">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onChange(r.id); setOpen(false) }}
              className={cn('flex w-full flex-col rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg-3', value === r.id && 'bg-bg-3')}
            >
              <span className={cn('text-[12px]', r.tint)}>{r.label}</span>
              <span className="text-[11px] text-fg-3">{r.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Kleine actie-menu (ellipsis) zonder portal.
export function ActionMenu({ items }: { items: { label: string; icon: string; danger?: boolean; onClick: () => void }[] }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} className="grid size-7 place-content-center rounded-md text-fg-3 transition-colors hover:bg-bg-3 hover:text-fg-1">
        <SvgIcon name="ellipsis" size={16} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-border-subtle bg-bg-2 p-1 shadow-lg">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => { it.onClick(); setOpen(false) }}
              className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-bg-3', it.danger ? 'text-red-500' : 'text-fg-1')}
            >
              <SvgIcon name={it.icon} size={14} />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function VariantBar<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-bg-0 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn('rounded-full px-3 py-1 text-[12px] transition-colors', EASE, value === o.value ? 'bg-secondary text-fg-1' : 'text-fg-2 hover:text-fg-1')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
