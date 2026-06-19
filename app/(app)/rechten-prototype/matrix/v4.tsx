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
  featureById,
  LEVELS,
  LevelBadge,
  LevelDropdown,
  RolePill,
  VariantShell,
  levelMeta,
  useRolesState,
  type FeatureId,
  type Level,
  type RoleId,
} from '../shared'

// Variant "Presets + diff": kies een rol, kies een basis-preset (andere rol als sjabloon),
// en beheer alleen de features waar de rol AFWIJKT. Minimale, leesbare configuratie.

export default function Variant() {
  const { roles, setLevel } = useRolesState()

  const [roleId, setRoleId] = React.useState<RoleId>('manager')
  const [baseId, setBaseId] = React.useState<RoleId>('lid')
  const [showAll, setShowAll] = React.useState(false)
  const [picking, setPicking] = React.useState(false)

  const role = roles.find((r) => r.id === roleId)!
  const base = roles.find((r) => r.id === baseId)!

  // Features waar de rol afwijkt van de basis-preset.
  const diffs = React.useMemo(
    () => FEATURES.filter((f) => role.perms[f.id] !== base.perms[f.id]),
    [role.perms, base.perms],
  )
  const sameCount = FEATURES.length - diffs.length

  // De rest (= identiek aan basis) voor de "toon alle"-expander.
  const sameFeatures = React.useMemo(
    () => FEATURES.filter((f) => role.perms[f.id] === base.perms[f.id]),
    [role.perms, base.perms],
  )

  // Basis-keuze mag niet de rol zelf zijn.
  const baseOptions = roles.filter((r) => r.id !== roleId)

  // Wanneer je van rol wisselt: zorg dat de basis een andere rol is.
  function onPickRole(id: RoleId) {
    setRoleId(id)
    if (baseId === id) {
      const fallback = roles.find((r) => r.id !== id)
      if (fallback) setBaseId(fallback.id)
    }
    setShowAll(false)
    setPicking(false)
  }

  function resetToBase(f: FeatureId) {
    setLevel(roleId, f, base.perms[f])
  }

  function addException(f: FeatureId, level: Level) {
    setLevel(roleId, f, level)
    setPicking(false)
  }

  return (
    <VariantShell
      title="Presets + diff"
      blurb="Begin bij een preset, beheer alleen de afwijkingen."
      wide
    >
      <div className="space-y-3">
        {/* Rolkiezer */}
        <div className="rounded-xl border border-border-subtle bg-bg-1 p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-fg-3">
            Rol
          </p>
          <div className="flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <RolePill key={r.id} roleId={r.id} active={r.id === roleId} onClick={() => onPickRole(r.id)} />
            ))}
          </div>
          <p className="mt-2.5 text-[12px] text-fg-3">{role.desc}</p>
        </div>

        {/* Basis-preset + samenvatting */}
        <div className="rounded-xl border border-border-subtle bg-bg-1 p-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px]">
            <span className="text-fg-3">Gebaseerd op</span>
            <BasePicker value={baseId} options={baseOptions} onChange={setBaseId} />
            <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-fg-3">
              <SvgIcon name="check" size={12} className="text-green-500" />
              {sameCount} {sameCount === 1 ? 'feature' : 'features'} gelijk aan basis
            </span>
          </div>
          <p className="mt-2 text-[12px] text-fg-3">
            <span className="text-fg-2">{role.name}</span> erft alle rechten van{' '}
            <span className="text-fg-2">{base.name}</span>; hieronder beheer je alleen waar het afwijkt.
          </p>
        </div>

        {/* Diff-weergave */}
        <div className="rounded-xl border border-border-subtle bg-bg-2">
          <div className="flex items-center justify-between border-b border-border-subtle px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <SvgIcon name="arrows-sort" size={14} className="text-fg-3" />
              <h4 className="text-[13px] font-medium text-fg-1">Afwijkingen van {base.name}</h4>
              <span className="rounded-full bg-bg-3 px-1.5 py-0.5 text-[11px] text-fg-2">{diffs.length}</span>
            </div>
            <Button size="xs" variant="outline" onClick={() => setPicking((p) => !p)}>
              <SvgIcon name={picking ? 'x' : 'plus'} size={13} />
              {picking ? 'Sluiten' : 'uitzondering toevoegen'}
            </Button>
          </div>

          {/* Feature-kiezer voor nieuwe uitzondering */}
          {picking && (
            <ExceptionPicker
              base={base.perms}
              existing={diffs.map((d) => d.id)}
              onAdd={addException}
            />
          )}

          {/* Lijst van afwijkende rijen */}
          {diffs.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
              <SvgIcon name="badge-check" size={22} className="text-green-500" />
              <p className="text-[13px] text-fg-1">Identiek aan {base.name}</p>
              <p className="text-[12px] text-fg-3">
                Deze rol heeft exact dezelfde rechten als de basis-preset. Voeg een uitzondering toe om af te wijken.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {diffs.map((f) => (
                <DiffRow
                  key={f.id}
                  feature={f.id}
                  from={base.perms[f.id]}
                  to={role.perms[f.id]}
                  onChange={(l) => setLevel(roleId, f.id, l)}
                  onReset={() => resetToBase(f.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Expander: toon alle (ongewijzigde) features */}
        {sameFeatures.length > 0 && (
          <div className="rounded-xl border border-border-subtle bg-bg-1">
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className={cn(
                'flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-bg-2',
                EASE,
              )}
            >
              <span className="flex items-center gap-2 text-[13px] text-fg-2">
                <SvgIcon
                  name="chevron-down"
                  size={14}
                  className={cn('text-fg-3 transition-transform', EASE, showAll && 'rotate-180')}
                />
                Toon alle features
                <span className="text-[12px] text-fg-3">({sameFeatures.length} gelijk aan basis)</span>
              </span>
              <span className="text-[11px] text-fg-3">{showAll ? 'verbergen' : 'tonen'}</span>
            </button>
            {showAll && (
              <div className="border-t border-border-subtle px-1.5 pb-1.5 pt-1">
                {FEATURE_GROUPS.map((g) => {
                  const inGroup = sameFeatures.filter((f) => f.group === g)
                  if (inGroup.length === 0) return null
                  return (
                    <div key={g} className="mb-1 last:mb-0">
                      <p className="px-2 pb-0.5 pt-2 text-[11px] font-medium uppercase tracking-wide text-fg-3">{g}</p>
                      <ul>
                        {inGroup.map((f) => (
                          <SameRow
                            key={f.id}
                            feature={f.id}
                            level={role.perms[f.id]}
                            onOverride={(l) => setLevel(roleId, f.id, l)}
                          />
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </VariantShell>
  )
}

// ── Basis-preset kiezer (kleine dropdown, geen portal) ─────────────────────────
function BasePicker({
  value,
  options,
  onChange,
}: {
  value: RoleId
  options: { id: RoleId; name: string; tint: string }[]
  onChange: (id: RoleId) => void
}) {
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
  const current = options.find((o) => o.id === value) ?? options[0]
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-2.5 py-1 text-[12px] transition-colors hover:border-border-strong',
          EASE,
        )}
      >
        <span className={cn('size-1.5 rounded-full', (current?.tint ?? 'text-fg-3').replace('text-', 'bg-'))} />
        <span className="text-fg-1">{current?.name}</span>
        <SvgIcon name="chevron-down" size={12} className="text-fg-3" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-44 overflow-hidden rounded-lg border border-border-subtle bg-bg-2 p-1 shadow-lg">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onChange(o.id)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-bg-3',
                value === o.id && 'bg-bg-3',
              )}
            >
              <span className={cn('size-1.5 rounded-full', o.tint.replace('text-', 'bg-'))} />
              <span className="text-fg-1">{o.name}</span>
              {value === o.id && <SvgIcon name="check" size={12} className="ml-auto text-green-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Afwijkende rij: van X → naar Y + dropdown + reset ──────────────────────────
function DiffRow({
  feature,
  from,
  to,
  onChange,
  onReset,
}: {
  feature: FeatureId
  from: Level
  to: Level
  onChange: (l: Level) => void
  onReset: () => void
}) {
  const f = featureById(feature)
  const up = to > from
  return (
    <li className="flex items-center gap-3 px-3.5 py-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-bg-3 text-fg-2">
        <FeatureIcon id={feature} size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-fg-1">{f.label}</p>
        <p className="truncate text-[11px] text-fg-3">{f.desc}</p>
      </div>

      {/* van → naar */}
      <div className="hidden items-center gap-1.5 sm:flex">
        <span className="opacity-60">
          <LevelBadge level={from} />
        </span>
        <SvgIcon
          name={up ? 'chevron-up' : 'chevron-down'}
          size={13}
          className={cn(up ? 'text-green-500' : 'text-orange-500')}
        />
        <LevelBadge level={to} />
      </div>

      {/* bewerk + reset */}
      <div className="flex items-center gap-1">
        <LevelDropdown value={to} onChange={onChange} />
        <button
          type="button"
          onClick={onReset}
          title={`Terug naar basis (${levelMeta(from).short})`}
          className={cn(
            'flex size-7 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-bg-3 hover:text-fg-1',
            EASE,
          )}
        >
          <SvgIcon name="refresh" size={13} />
        </button>
      </div>
    </li>
  )
}

// ── Ongewijzigde rij (in de "toon alle"-expander): inline override mogelijk ─────
function SameRow({
  feature,
  level,
  onOverride,
}: {
  feature: FeatureId
  level: Level
  onOverride: (l: Level) => void
}) {
  const f = featureById(feature)
  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-2">
      <FeatureIcon id={feature} size={14} className="shrink-0 text-fg-3" />
      <span className="min-w-0 flex-1 truncate text-[13px] text-fg-2">{f.label}</span>
      <span className="text-[11px] text-fg-3">gelijk aan basis</span>
      <LevelDropdown value={level} onChange={onOverride} />
    </li>
  )
}

// ── Feature-kiezer voor een nieuwe uitzondering ────────────────────────────────
function ExceptionPicker({
  base,
  existing,
  onAdd,
}: {
  base: Record<FeatureId, Level>
  existing: FeatureId[]
  onAdd: (f: FeatureId, l: Level) => void
}) {
  const [query, setQuery] = React.useState('')
  const [sel, setSel] = React.useState<FeatureId | null>(null)

  // Alleen features die nog géén afwijking hebben.
  const available = FEATURES.filter((f) => !existing.includes(f.id))
  const filtered = available.filter((f) => f.label.toLowerCase().includes(query.toLowerCase()))

  const selFeature = sel ? featureById(sel) : null
  const selBase = sel ? base[sel] : 0

  return (
    <div className="border-b border-border-subtle bg-bg-1 p-3">
      {!sel ? (
        <>
          <div className="relative mb-2">
            <SvgIcon
              name="magnifying-glass"
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek een feature om af te wijken…"
              autoFocus
              className={cn(
                'w-full rounded-lg border border-border-subtle bg-bg-2 py-1.5 pl-8 pr-2.5 text-[13px] text-fg-1 outline-none transition-colors placeholder:text-fg-3 focus:border-border-strong',
                EASE,
              )}
            />
          </div>
          {filtered.length === 0 ? (
            <p className="px-1 py-2 text-[12px] text-fg-3">
              {available.length === 0 ? 'Alle features hebben al een afwijking.' : 'Geen resultaten.'}
            </p>
          ) : (
            <div className="grid max-h-44 grid-cols-1 gap-0.5 overflow-auto sm:grid-cols-2">
              {filtered.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSel(f.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-bg-3',
                    EASE,
                  )}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-bg-3 text-fg-2">
                    <FeatureIcon id={f.id} size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-fg-1">{f.label}</span>
                    <span className="block truncate text-[11px] text-fg-3">
                      basis: {levelMeta(base[f.id]).short}
                    </span>
                  </span>
                  <SvgIcon name="chevron-right" size={13} className="text-fg-3" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setSel(null)}
            className={cn('mb-2.5 inline-flex items-center gap-1 text-[12px] text-fg-3 transition-colors hover:text-fg-1', EASE)}
          >
            <SvgIcon name="arrow-left" size={12} /> Andere feature
          </button>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-bg-3 text-fg-2">
              <FeatureIcon id={sel} size={15} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] text-fg-1">{selFeature!.label}</p>
              <p className="truncate text-[11px] text-fg-3">
                basis is <span className="text-fg-2">{levelMeta(selBase).short}</span> — kies een afwijkend niveau
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {LEVELS.map((l) => {
              const isBase = l.value === selBase
              return (
                <button
                  key={l.value}
                  type="button"
                  disabled={isBase}
                  onClick={() => onAdd(sel, l.value)}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-lg border px-2.5 py-2 text-left transition-colors',
                    EASE,
                    isBase
                      ? 'cursor-not-allowed border-border-subtle opacity-40'
                      : 'border-border-subtle hover:border-border-strong hover:bg-bg-3',
                  )}
                >
                  <span className={cn('inline-flex items-center gap-1.5 text-[12px]', l.tint)}>
                    <SvgIcon name={l.icon} size={13} />
                    {l.short}
                  </span>
                  <span className="text-[11px] text-fg-3">{isBase ? '= basis' : l.desc}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
