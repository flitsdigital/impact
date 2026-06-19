'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  FEATURES,
  FEATURE_GROUPS,
  FeatureIcon,
  LEVELS,
  levelMeta,
  ROLES,
  useRolesState,
  VariantShell,
  type FeatureGroup,
  type FeatureId,
  type Level,
  type Role,
} from '../shared'

// ponytail: "Volledige matrix" — rollen als kolommen, features als rijen. Eén dichte
// grid die alles in één blik toont. Cellen cyclen door de niveaus; geen modals nodig.

const ORDER: Level[] = [0, 1, 2, 3]
const nextLevel = (l: Level): Level => ORDER[(ORDER.indexOf(l) + 1) % ORDER.length]
const prevLevel = (l: Level): Level => ORDER[(ORDER.indexOf(l) + ORDER.length - 1) % ORDER.length]

/** Eén cel: klik = ophogen, rechtsklik = verlagen. Toont dot + korte tekst. */
function MatrixCell({
  level,
  roleName,
  featureLabel,
  system,
  onCycle,
  onSet,
}: {
  level: Level
  roleName: string
  featureLabel: string
  system?: boolean
  onCycle: (dir: 1 | -1) => void
  onSet: (l: Level) => void
}) {
  const m = levelMeta(level)
  const [menu, setMenu] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  const locked = system && level === 3 // beheerder: niveau staat vast op beheren

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={locked}
        title={`${roleName} · ${featureLabel} — ${m.label}${locked ? ' (vast)' : '\nKlik: ophogen · rechtsklik: verlagen · dubbelklik: kiezen'}`}
        onClick={() => !locked && onCycle(1)}
        onContextMenu={(e) => {
          e.preventDefault()
          if (!locked) onCycle(-1)
        }}
        onDoubleClick={() => !locked && setMenu(true)}
        className={cn(
          'group flex h-9 w-full items-center justify-center gap-1.5 rounded-md text-[12px] transition-colors',
          EASE,
          m.bg,
          m.tint,
          locked ? 'cursor-default opacity-90' : 'hover:brightness-125',
        )}
      >
        <SvgIcon name={m.icon} size={12} />
        <span className="tabular-nums">{m.short}</span>
        {locked && <SvgIcon name="triangle-exclamation" size={10} className="opacity-50" />}
      </button>

      {menu && (
        <div className="absolute left-1/2 top-full z-30 mt-1 w-44 -translate-x-1/2 overflow-hidden rounded-lg border border-border-subtle bg-bg-2 p-1 shadow-lg">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => {
                onSet(l.value)
                setMenu(false)
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg-3',
                level === l.value && 'bg-bg-3',
              )}
            >
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

export default function Variant() {
  const { roles, setLevel, setRoles } = useRolesState()

  // Grid-template: één feature-kolom + één kolom per rol.
  const cols = `minmax(180px,1.4fr) repeat(${roles.length}, minmax(110px,1fr))`

  // Snelactie: hele kolom (rol) op één niveau zetten. Beheerder blijft op beheren.
  const setColumn = (role: Role, level: Level) => {
    if (role.id === 'beheerder') return
    for (const f of FEATURES) setLevel(role.id, f.id, level)
  }

  // Snelactie: hele rij (feature) op één niveau zetten (beheerder overgeslagen).
  const setRow = (f: FeatureId, level: Level) => {
    for (const r of roles) {
      if (r.id === 'beheerder') continue
      setLevel(r.id, f, level)
    }
  }

  // Terug naar de presets uit het model.
  const reset = () => setRoles(ROLES.map((r) => ({ ...r, perms: { ...r.perms } })))

  // Tellingen voor de footer-samenvatting.
  const totalCells = roles.length * FEATURES.length
  const counts = React.useMemo(() => {
    const c: Record<Level, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
    for (const r of roles) for (const f of FEATURES) c[r.perms[f.id]]++
    return c
  }, [roles])

  return (
    <VariantShell
      title="Volledige matrix"
      blurb="Rollen als kolommen, features als rijen — elke cel een niveau."
    >
      {/* Help-balk */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border-subtle bg-bg-1 px-3 py-2 text-[11px] text-fg-3">
        <span className="inline-flex items-center gap-1.5">
          <kbd className="rounded bg-bg-3 px-1.5 py-0.5 text-fg-2">Klik</kbd> ophogen
        </span>
        <span className="inline-flex items-center gap-1.5">
          <kbd className="rounded bg-bg-3 px-1.5 py-0.5 text-fg-2">Rechtsklik</kbd> verlagen
        </span>
        <span className="inline-flex items-center gap-1.5">
          <kbd className="rounded bg-bg-3 px-1.5 py-0.5 text-fg-2">Dubbelklik</kbd> kies niveau
        </span>
        <span className="ml-auto inline-flex items-center gap-3">
          {LEVELS.map((l) => (
            <span key={l.value} className="inline-flex items-center gap-1">
              <span className={cn('size-2 rounded-full', l.tint.replace('text-', 'bg-'))} />
              <span className="text-fg-2">{l.short}</span>
            </span>
          ))}
        </span>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-1">
        <div className="min-w-[560px]">
          <div className="grid" style={{ gridTemplateColumns: cols }}>
            {/* ── Sticky kolomkoppen: rollen ── */}
            <div className="sticky top-0 z-20 border-b border-border-subtle bg-bg-1 px-3 py-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-fg-3">Feature</span>
            </div>
            {roles.map((r) => (
              <RoleHeader key={r.id} role={r} onSetColumn={(l) => setColumn(r, l)} />
            ))}

            {/* ── Rijen per groep ── */}
            {FEATURE_GROUPS.map((group) => (
              <GroupRows
                key={group}
                group={group}
                roles={roles}
                colSpan={roles.length + 1}
                onCell={setLevel}
                onSetRow={setRow}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer: samenvatting + reset */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-fg-3">
          <span className="text-fg-2">{totalCells} cellen</span>
          {LEVELS.map((l) => (
            <span key={l.value} className="inline-flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', l.tint.replace('text-', 'bg-'))} />
              <span className="tabular-nums text-fg-2">{counts[l.value]}</span>
              <span>{l.short}</span>
            </span>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>
          <SvgIcon name="refresh" size={13} /> Beginwaarden
        </Button>
      </div>
    </VariantShell>
  )
}

/** Kolomkop voor één rol: naam + mini-vulknoppen om de hele kolom te zetten. */
function RoleHeader({ role, onSetColumn }: { role: Role; onSetColumn: (l: Level) => void }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div
      ref={ref}
      className="sticky top-0 z-20 border-b border-l border-border-subtle bg-bg-1 px-2 py-2.5"
    >
      <div className="flex flex-col items-center gap-1">
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('size-1.5 rounded-full', role.tint.replace('text-', 'bg-'))} />
          <span className={cn('text-[12px] font-medium', role.tint)}>{role.name}</span>
        </span>
        <div className="flex items-center gap-1">
          {role.system && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-bg-3 px-1.5 py-0.5 text-[10px] text-fg-3">
              <SvgIcon name="badge-check" size={9} /> systeem
            </span>
          )}
          {role.id !== 'beheerder' && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              title="Hele kolom instellen"
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] text-fg-3 transition-colors hover:bg-bg-3 hover:text-fg-1',
                EASE,
              )}
            >
              kolom <SvgIcon name="chevron-down" size={9} />
            </button>
          )}
        </div>
      </div>

      {open && role.id !== 'beheerder' && (
        <div className="absolute left-1/2 top-full z-30 mt-1 w-40 -translate-x-1/2 overflow-hidden rounded-lg border border-border-subtle bg-bg-2 p-1 shadow-lg">
          <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-fg-3">
            Hele kolom op…
          </p>
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => {
                onSetColumn(l.value)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg-3"
            >
              <SvgIcon name={l.icon} size={13} className={l.tint} />
              <span className={cn('text-[12px]', l.tint)}>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Subkop + rijen voor één feature-groep. */
function GroupRows({
  group,
  roles,
  colSpan,
  onCell,
  onSetRow,
}: {
  group: FeatureGroup
  roles: Role[]
  colSpan: number
  onCell: (roleId: string, f: FeatureId, l: Level) => void
  onSetRow: (f: FeatureId, l: Level) => void
}) {
  const feats = FEATURES.filter((f) => f.group === group)
  return (
    <>
      {/* Subkop over de volle breedte */}
      <div
        className="border-b border-border-subtle bg-bg-0 px-3 py-1.5"
        style={{ gridColumn: `1 / ${colSpan + 1}` }}
      >
        <span className="text-[11px] font-medium uppercase tracking-wide text-fg-3">{group}</span>
      </div>

      {feats.map((f) => (
        <FeatureRow key={f.id} feature={f.id} roles={roles} onCell={onCell} onSetRow={onSetRow} />
      ))}
    </>
  )
}

/** Eén feature-rij: label-cel (sticky links) + één cel per rol. */
function FeatureRow({
  feature,
  roles,
  onCell,
  onSetRow,
}: {
  feature: FeatureId
  roles: Role[]
  onCell: (roleId: string, f: FeatureId, l: Level) => void
  onSetRow: (f: FeatureId, l: Level) => void
}) {
  const meta = FEATURES.find((x) => x.id === feature)!
  const [rowMenu, setRowMenu] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!rowMenu) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setRowMenu(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [rowMenu])

  return (
    <>
      {/* Sticky feature-label links */}
      <div
        ref={ref}
        className="group sticky left-0 z-10 flex items-center gap-2 border-b border-border-subtle bg-bg-1 px-3 py-1.5"
      >
        <FeatureIcon id={feature} size={15} className="text-fg-3" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-fg-1">{meta.label}</p>
          <p className="truncate text-[11px] text-fg-3">{meta.desc}</p>
        </div>
        <button
          type="button"
          onClick={() => setRowMenu((o) => !o)}
          title="Hele rij instellen"
          className={cn(
            'shrink-0 rounded p-1 text-fg-3 opacity-0 transition-opacity hover:bg-bg-3 hover:text-fg-1 group-hover:opacity-100',
            EASE,
            rowMenu && 'opacity-100',
          )}
        >
          <SvgIcon name="ellipsis" size={14} />
        </button>

        {rowMenu && (
          <div className="absolute right-2 top-full z-30 mt-1 w-40 overflow-hidden rounded-lg border border-border-subtle bg-bg-2 p-1 shadow-lg">
            <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-fg-3">Hele rij op…</p>
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => {
                  onSetRow(feature, l.value)
                  setRowMenu(false)
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg-3"
              >
                <SvgIcon name={l.icon} size={13} className={l.tint} />
                <span className={cn('text-[12px]', l.tint)}>{l.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cellen per rol */}
      {roles.map((r) => {
        const level = r.perms[feature]
        return (
          <div key={r.id} className="border-b border-l border-border-subtle bg-bg-1 p-1">
            <MatrixCell
              level={level}
              roleName={r.name}
              featureLabel={meta.label}
              system={r.id === 'beheerder'}
              onCycle={(dir) => onCell(r.id, feature, dir === 1 ? nextLevel(level) : prevLevel(level))}
              onSet={(l) => onCell(r.id, feature, l)}
            />
          </div>
        )
      })}
    </>
  )
}
