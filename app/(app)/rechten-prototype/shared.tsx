'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'

// ponytail: gedeelde basis voor de granulaire-rechten prototypes. Eén permissie-model dat
// álle varianten delen, zodat de 24 prototypes onderling consistent zijn. Mockdata, geen DB.
// Verhuist pas naar productie (role-kolom + RLS) als er per stap een winnaar gekozen is.

export const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]'

// ── Features (= de pagina's/modules van de app) ──────────────────────────────
export type FeatureId =
  | 'dashboard' | 'klanten' | 'facturatie' | 'content' | 'leads'
  | 'projecten' | 'taken' | 'gebruikers' | 'instellingen'
export type FeatureGroup = 'Werk' | 'Klanten' | 'Systeem'

export const FEATURES: { id: FeatureId; label: string; icon: string; group: FeatureGroup; desc: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-grid', group: 'Werk', desc: 'Overzicht & widgets' },
  { id: 'projecten', label: 'Projecten', icon: 'chart-kanban', group: 'Werk', desc: 'Projecten & planning' },
  { id: 'taken', label: 'Taken', icon: 'list-check', group: 'Werk', desc: "Taken & to-do's" },
  { id: 'content', label: 'Content', icon: 'image-square', group: 'Werk', desc: 'Content plannen & posts' },
  { id: 'klanten', label: 'Klanten', icon: 'users', group: 'Klanten', desc: 'Klantdossiers' },
  { id: 'leads', label: 'Leads', icon: 'user-plus', group: 'Klanten', desc: 'Sales-pijplijn' },
  { id: 'facturatie', label: 'Facturatie', icon: 'file-invoice-dollar', group: 'Klanten', desc: 'Facturen & omzet' },
  { id: 'gebruikers', label: 'Gebruikers', icon: 'smile', group: 'Systeem', desc: 'Team & rechten' },
  { id: 'instellingen', label: 'Instellingen', icon: 'settings', group: 'Systeem', desc: 'Koppelingen & audit' },
]
export const featureById = (id: FeatureId) => FEATURES.find((f) => f.id === id)!
export const FEATURE_GROUPS: FeatureGroup[] = ['Werk', 'Klanten', 'Systeem']

export function FeatureIcon({ id, size = 16, className }: { id: FeatureId; size?: number; className?: string }) {
  return <SvgIcon name={featureById(id).icon} size={size} className={className} />
}

// ── Niveaus (per feature) ────────────────────────────────────────────────────
export type Level = 0 | 1 | 2 | 3 // geen, bekijken, bewerken, beheren
export const LEVELS: { value: Level; label: string; short: string; icon: string; tint: string; bg: string; desc: string }[] = [
  { value: 0, label: 'Geen toegang', short: 'Geen', icon: 'x', tint: 'text-fg-3', bg: 'bg-bg-3', desc: 'Feature is verborgen' },
  { value: 1, label: 'Bekijken', short: 'Bekijken', icon: 'magnifying-glass', tint: 'text-blue-500', bg: 'bg-blue-500/15', desc: 'Alleen lezen' },
  { value: 2, label: 'Bewerken', short: 'Bewerken', icon: 'pencil', tint: 'text-purple-500', bg: 'bg-purple-500/15', desc: 'Bekijken + wijzigen' },
  { value: 3, label: 'Beheren', short: 'Beheren', icon: 'bolt', tint: 'text-green-500', bg: 'bg-green-500/15', desc: 'Volledig, incl. verwijderen' },
]
export const levelMeta = (l: Level) => LEVELS[l]

// Fijnere acties — voor varianten die per-actie granulariteit willen tonen.
export type ActionId = 'view' | 'create' | 'edit' | 'delete' | 'export'
export const ACTIONS: { id: ActionId; label: string; icon: string }[] = [
  { id: 'view', label: 'Bekijken', icon: 'magnifying-glass' },
  { id: 'create', label: 'Aanmaken', icon: 'plus' },
  { id: 'edit', label: 'Bewerken', icon: 'pencil' },
  { id: 'delete', label: 'Verwijderen', icon: 'trash' },
  { id: 'export', label: 'Exporteren', icon: 'download' },
]
export const actionsForLevel = (l: Level): ActionId[] =>
  l <= 0 ? [] : l === 1 ? ['view'] : l === 2 ? ['view', 'create', 'edit', 'export'] : ['view', 'create', 'edit', 'delete', 'export']

// ── Permissie-map: feature → niveau ──────────────────────────────────────────
export type PermMap = Record<FeatureId, Level>
export function makePerm(base: Level, overrides: Partial<PermMap> = {}): PermMap {
  const m = {} as PermMap
  for (const f of FEATURES) m[f.id] = base
  return { ...m, ...overrides }
}

// ── Rollen (presets) ─────────────────────────────────────────────────────────
export type RoleId = string
export type Role = { id: RoleId; name: string; tint: string; bg: string; system?: boolean; desc: string; perms: PermMap }

export const ROLES: Role[] = [
  {
    id: 'beheerder', name: 'Beheerder', tint: 'text-purple-500', bg: 'bg-purple-500/15', system: true,
    desc: 'Volledige toegang tot alles, inclusief rechtenbeheer',
    perms: makePerm(3),
  },
  {
    id: 'manager', name: 'Manager', tint: 'text-blue-500', bg: 'bg-blue-500/15',
    desc: 'Stuurt het werk aan, geen systeeminstellingen',
    perms: makePerm(3, { dashboard: 1, facturatie: 2, gebruikers: 1, instellingen: 0 }),
  },
  {
    id: 'lid', name: 'Lid', tint: 'text-green-500', bg: 'bg-green-500/15', system: true,
    desc: 'Werkt mee aan klanten, content en projecten',
    perms: makePerm(2, { dashboard: 1, facturatie: 1, leads: 1, gebruikers: 0, instellingen: 0 }),
  },
  {
    id: 'lezer', name: 'Alleen lezen', tint: 'text-fg-2', bg: 'bg-bg-3', system: true,
    desc: 'Bekijkt alles, wijzigt niets',
    perms: makePerm(1, { gebruikers: 0, instellingen: 0 }),
  },
]
export const roleById = (id: RoleId) => ROLES.find((r) => r.id === id) ?? ROLES[0]

// ── Gebruikers ───────────────────────────────────────────────────────────────
export type UserStatus = 'actief' | 'uitgenodigd' | 'inactief'
export type User = {
  id: string; name: string; email: string; roleId: RoleId
  overrides?: Partial<PermMap>; status: UserStatus; lastActive: string
}
export const USERS: User[] = [
  { id: 'u1', name: 'Jordi Klavers', email: 'jordi@flits.nl', roleId: 'beheerder', status: 'actief', lastActive: 'nu' },
  { id: 'u2', name: 'Sam Lee', email: 'sam@flits.nl', roleId: 'manager', status: 'actief', lastActive: '2 uur geleden' },
  { id: 'u3', name: 'Mees Peters', email: 'mees@flits.nl', roleId: 'lid', overrides: { facturatie: 2 }, status: 'actief', lastActive: 'gisteren' },
  { id: 'u4', name: 'Noa de Vries', email: 'noa@bureau.nl', roleId: 'lezer', status: 'uitgenodigd', lastActive: '—' },
  { id: 'u5', name: 'Tim Bakker', email: 'tim@flits.nl', roleId: 'lid', status: 'inactief', lastActive: '3 maanden geleden' },
]
export function effectivePerms(u: User): PermMap {
  return { ...roleById(u.roleId).perms, ...(u.overrides ?? {}) }
}
export const isOverridden = (u: User, f: FeatureId) =>
  u.overrides?.[f] !== undefined && u.overrides[f] !== roleById(u.roleId).perms[f]

// ── Atomen ───────────────────────────────────────────────────────────────────
export function LevelDot({ level, size = 8 }: { level: Level; size?: number }) {
  const m = levelMeta(level)
  return <span className={cn('inline-block rounded-full', m.tint.replace('text-', 'bg-'))} style={{ width: size, height: size }} />
}

export function LevelBadge({ level, withIcon = true }: { level: Level; withIcon?: boolean }) {
  const m = levelMeta(level)
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]', m.bg, m.tint)}>
      {withIcon && <SvgIcon name={m.icon} size={11} />}
      {m.short}
    </span>
  )
}

/** Compacte 4-weg niveau-kiezer (segmented). */
export function LevelSelect({
  value, onChange, showLabels = false, className,
}: { value: Level; onChange: (l: Level) => void; showLabels?: boolean; className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-0.5 rounded-lg bg-bg-0 p-0.5', className)}>
      {LEVELS.map((l) => (
        <button
          key={l.value}
          type="button"
          title={`${l.label} — ${l.desc}`}
          onClick={() => onChange(l.value)}
          className={cn(
            'flex items-center gap-1 rounded-md px-2 py-1 text-[12px] transition-colors',
            EASE,
            value === l.value ? cn('bg-secondary', l.tint) : 'text-fg-3 hover:text-fg-1',
          )}
        >
          <SvgIcon name={l.icon} size={12} />
          {showLabels && <span>{l.short}</span>}
        </button>
      ))}
    </div>
  )
}

/** Niveau-dropdown zonder portal (veilig binnen overlays/drawers). */
export function LevelDropdown({ value, onChange }: { value: Level; onChange: (l: Level) => void }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const m = levelMeta(value)
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} className={cn('inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-[12px] transition-colors hover:border-border-strong', m.tint)}>
        <SvgIcon name={m.icon} size={12} /> {m.short}
        <SvgIcon name="chevron-down" size={12} className="text-fg-3" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-48 overflow-hidden rounded-lg border border-border-subtle bg-bg-2 p-1 shadow-lg">
          {LEVELS.map((l) => (
            <button key={l.value} type="button" onClick={() => { onChange(l.value); setOpen(false) }}
              className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg-3', value === l.value && 'bg-bg-3')}>
              <SvgIcon name={l.icon} size={13} className={l.tint} />
              <span className="flex flex-col">
                <span className={cn('text-[12px]', l.tint)}>{l.label}</span>
                <span className="text-[11px] text-fg-3">{l.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function RolePill({ roleId, onClick, active }: { roleId: RoleId; onClick?: () => void; active?: boolean }) {
  const r = roleById(roleId)
  return (
    <button type="button" onClick={onClick}
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] transition-colors', EASE,
        active ? cn(r.bg, r.tint) : 'border border-border-subtle text-fg-2 hover:text-fg-1')}>
      <span className={cn('size-1.5 rounded-full', r.tint.replace('text-', 'bg-'))} />
      {r.name}
    </button>
  )
}

export function VariantBar<T extends string>({
  options, value, onChange, className,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('inline-flex flex-wrap items-center gap-1 rounded-full bg-bg-0 p-0.5', className)}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cn('rounded-full px-3 py-1 text-[12px] transition-colors', EASE, value === o.value ? 'bg-secondary text-fg-1' : 'text-fg-2 hover:text-fg-1')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Standaard wrapper voor een prototype-variant: titel + korte toelichting + inhoud. */
export function VariantShell({ title, blurb, children, wide }: { title: string; blurb: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('mx-auto w-full', wide ? 'max-w-4xl' : 'max-w-2xl')}>
      <div className="mb-4">
        <h3 className="text-[14px] font-medium text-fg-1">{title}</h3>
        <p className="text-[12px] text-fg-3">{blurb}</p>
      </div>
      {children}
    </div>
  )
}

// Stateful hooks voor varianten die muteren.
export function useRolesState() {
  const [roles, setRoles] = React.useState<Role[]>(() => ROLES.map((r) => ({ ...r, perms: { ...r.perms } })))
  const setLevel = (roleId: RoleId, f: FeatureId, level: Level) =>
    setRoles((rs) => rs.map((r) => (r.id === roleId ? { ...r, perms: { ...r.perms, [f]: level } } : r)))
  return { roles, setRoles, setLevel }
}
export function useUsersState() {
  const [users, setUsers] = React.useState<User[]>(() => USERS.map((u) => ({ ...u })))
  const setRole = (id: string, roleId: RoleId) => setUsers((us) => us.map((u) => (u.id === id ? { ...u, roleId, overrides: {} } : u)))
  const setOverride = (id: string, f: FeatureId, level: Level | undefined) =>
    setUsers((us) => us.map((u) => {
      if (u.id !== id) return u
      const ov = { ...(u.overrides ?? {}) }
      if (level === undefined) delete ov[f]; else ov[f] = level
      return { ...u, overrides: ov }
    }))
  return { users, setUsers, setRole, setOverride }
}
