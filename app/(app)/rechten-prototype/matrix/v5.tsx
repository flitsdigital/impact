'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  FEATURES,
  FEATURE_GROUPS,
  FeatureIcon,
  LEVELS,
  levelMeta,
  useRolesState,
  VariantShell,
  type FeatureId,
  type Level,
  type Role,
} from '../shared'

// ponytail: rol-kaarten met een eigen 4-staps slider per feature. De slider is puur
// state-gedreven (geen library) — 4 klikbare stops, een gekleurde track die tot het
// gekozen niveau loopt en de level-tint overneemt. Klik = setLevel in useRolesState().

const trackBgForLevel = (l: Level) =>
  // gekleurde "vulling" tot het gekozen niveau — leunt op de level-tints uit het model.
  l === 0 ? 'bg-bg-3' : l === 1 ? 'bg-blue-500' : l === 2 ? 'bg-purple-500' : 'bg-green-500'

/** Eigen 4-staps slider (0..3). Klik op een stop of de track zet het niveau. */
function LevelSlider({
  value,
  onChange,
}: {
  value: Level
  onChange: (l: Level) => void
}) {
  const meta = levelMeta(value)
  // breedte van de gevulde track: 0 → 0%, 3 → 100% (over de 4 stops verdeeld)
  const fillPct = (value / (LEVELS.length - 1)) * 100

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        {/* basis-track */}
        <div className="h-1.5 w-full rounded-full bg-bg-0" />
        {/* gevulde track tot het gekozen niveau */}
        <div
          className={cn(
            'absolute left-0 top-0 h-1.5 rounded-full transition-all duration-300',
            EASE,
            trackBgForLevel(value),
          )}
          style={{ width: `${fillPct}%` }}
        />
        {/* klikbare stops bovenop de track */}
        <div className="absolute inset-0 flex items-center justify-between">
          {LEVELS.map((l) => {
            const active = l.value <= value
            const isCurrent = l.value === value
            return (
              <button
                key={l.value}
                type="button"
                title={`${l.label} — ${l.desc}`}
                aria-label={l.label}
                onClick={() => onChange(l.value)}
                className="group relative flex size-6 items-center justify-center"
              >
                <span
                  className={cn(
                    'flex items-center justify-center rounded-full border-2 transition-all duration-200',
                    EASE,
                    isCurrent
                      ? cn('size-5 border-bg-1 shadow-sm', trackBgForLevel(value))
                      : active
                        ? cn('size-3 border-transparent', trackBgForLevel(l.value))
                        : 'size-3 border-border-strong bg-bg-2 group-hover:border-fg-3',
                  )}
                >
                  {isCurrent && l.value > 0 && (
                    <SvgIcon name={l.icon} size={11} className="text-bg-0" />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      {/* niveau-label naast de slider */}
      <span
        className={cn(
          'inline-flex w-[68px] shrink-0 items-center gap-1 text-[11px] tabular-nums transition-colors',
          meta.tint,
        )}
      >
        <SvgIcon name={meta.icon} size={11} />
        {meta.short}
      </span>
    </div>
  )
}

function RoleCard({
  role,
  onSet,
  onSetAll,
}: {
  role: Role
  onSet: (f: FeatureId, l: Level) => void
  onSetAll: (l: Level) => void
}) {
  // korte samenvatting: hoeveel features op welk niveau
  const counts = React.useMemo(() => {
    const c: Record<Level, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
    for (const f of FEATURES) c[role.perms[f.id]] += 1
    return c
  }, [role.perms])

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-2">
      {/* kaart-kop: naam + dot + desc */}
      <div className={cn('border-b border-border-subtle px-4 py-3.5', role.bg)}>
        <div className="flex items-start gap-2.5">
          <span className={cn('mt-1 size-2.5 shrink-0 rounded-full', role.tint.replace('text-', 'bg-'))} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className={cn('text-[14px] font-medium', role.tint)}>{role.name}</h4>
              {role.system && (
                <span className="inline-flex items-center gap-1 rounded-full bg-bg-0/40 px-1.5 py-0.5 text-[10px] text-fg-3">
                  <SvgIcon name="badge-check" size={10} />
                  Systeem
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12px] text-fg-2">{role.desc}</p>
          </div>
        </div>
        {/* mini-overzicht van de verdeling + snelle "alles op niveau" */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-fg-3">
            {LEVELS.map((l) => (
              <span key={l.value} className="inline-flex items-center gap-1">
                <span className={cn('size-1.5 rounded-full', trackBgForLevel(l.value))} />
                <span className="tabular-nums">{counts[l.value]}</span>
              </span>
            ))}
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg bg-bg-0/40 p-0.5">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                title={`Alles → ${l.label}`}
                onClick={() => onSetAll(l.value)}
                className={cn(
                  'flex size-6 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-bg-3',
                  EASE,
                )}
              >
                <SvgIcon name={l.icon} size={12} className={cn('transition-colors', EASE)} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* per-feature sliders, gegroepeerd */}
      <div className="flex flex-col gap-4 px-4 py-4">
        {FEATURE_GROUPS.map((group) => {
          const items = FEATURES.filter((f) => f.group === group)
          return (
            <div key={group}>
              <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-fg-3">{group}</p>
              <div className="flex flex-col gap-3.5">
                {items.map((f) => (
                  <div key={f.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <FeatureIcon id={f.id} size={14} className="text-fg-3" />
                      <span className="text-[13px] text-fg-1">{f.label}</span>
                    </div>
                    <LevelSlider
                      value={role.perms[f.id]}
                      onChange={(l) => onSet(f.id, l)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Variant() {
  const { roles, setLevel, setRoles } = useRolesState()

  const setAllForRole = (roleId: string, level: Level) =>
    setRoles((rs) =>
      rs.map((r) => {
        if (r.id !== roleId) return r
        const perms = { ...r.perms }
        for (const f of FEATURES) perms[f.id] = level
        return { ...r, perms }
      }),
    )

  return (
    <VariantShell
      title="Rol-kaarten + sliders"
      blurb="Elke rol een kaart, niveaus als gekleurde sliders."
      wide
    >
      {/* legenda: wat betekent welk niveau */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border-subtle bg-bg-1 px-3 py-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-fg-3">Niveaus</span>
        {LEVELS.map((l) => (
          <span key={l.value} className="inline-flex items-center gap-1.5 text-[12px]">
            <span className={cn('size-2 rounded-full', trackBgForLevel(l.value))} />
            <span className={l.tint}>{l.label}</span>
            <span className="text-fg-3">· {l.desc}</span>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            onSet={(f, l) => setLevel(role.id, f, l)}
            onSetAll={(l) => setAllForRole(role.id, l)}
          />
        ))}
      </div>
    </VariantShell>
  )
}
