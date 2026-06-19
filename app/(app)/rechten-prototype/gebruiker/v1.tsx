'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  FEATURES,
  FEATURE_GROUPS,
  FeatureIcon,
  LevelBadge,
  LevelDropdown,
  RolePill,
  VariantShell,
  effectivePerms,
  featureById,
  isOverridden,
  levelMeta,
  roleById,
  useUsersState,
  type FeatureId,
  type Level,
} from '../shared'

// Variant "Rol + uitzonderingen": rol = basis, overrides = expliciete afwijkingen.
// Eén gebruiker tegelijk in beeld; rij RolePills zet de rol, inklapbaar paneel beheert overrides.

export default function Variant() {
  const { users, setRole, setOverride } = useUsersState()
  const [selId, setSelId] = React.useState(users[0]?.id ?? '')
  const u = users.find((x) => x.id === selId) ?? users[0]

  const [openOverrides, setOpenOverrides] = React.useState(true)
  const [adding, setAdding] = React.useState(false)
  const [pickFeature, setPickFeature] = React.useState<FeatureId | ''>('')

  const role = roleById(u.roleId)
  const eff = effectivePerms(u)
  const overrideFeatures = FEATURES.filter((f) => isOverridden(u, f.id))
  const availableFeatures = FEATURES.filter((f) => !isOverridden(u, f.id))

  // Bij wissel van gebruiker: sluit de toevoeg-rij netjes.
  React.useEffect(() => {
    setAdding(false)
    setPickFeature('')
  }, [selId])

  const addOverride = (f: FeatureId, level: Level) => {
    setOverride(u.id, f, level)
    setAdding(false)
    setPickFeature('')
    setOpenOverrides(true)
  }

  return (
    <VariantShell title="Rol + uitzonderingen" blurb="Kies een rol, voeg gerichte uitzonderingen toe.">
      {/* Gebruiker-kiezer */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {users.map((m) => {
          const active = m.id === u.id
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelId(m.id)}
              className={cn(
                'flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[12px] transition-colors',
                EASE,
                active ? 'bg-secondary text-fg-1' : 'border border-border-subtle text-fg-2 hover:text-fg-1',
              )}
            >
              <Avatar name={m.name} size={24} />
              {m.name.split(' ')[0]}
            </button>
          )
        })}
      </div>

      {/* Geselecteerde gebruiker */}
      <div className="rounded-xl border border-border-subtle bg-bg-2">
        <div className="flex items-center gap-3 border-b border-border-subtle p-4">
          <Avatar name={u.name} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-fg-1">{u.name}</p>
            <p className="truncate text-[12px] text-fg-3">{u.email}</p>
          </div>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px]', role.bg, role.tint)}>
            <span className={cn('size-1.5 rounded-full', role.tint.replace('text-', 'bg-'))} />
            {role.name}
          </span>
        </div>

        {/* Stap 1 — Rol (de basis) */}
        <div className="border-b border-border-subtle p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-bg-3 text-[11px] font-medium text-fg-2">1</span>
            <h4 className="text-[13px] font-medium text-fg-1">Rol</h4>
            <span className="text-[12px] text-fg-3">— de basis voor alle rechten</span>
          </div>
          <p className="mb-3 pl-7 text-[12px] text-fg-3">{role.desc}</p>
          <div className="flex flex-wrap gap-2 pl-7">
            {/* RolePills: zet de rol, wist tegelijk de overrides (zie useUsersState.setRole) */}
            {['beheerder', 'manager', 'lid', 'lezer'].map((rid) => (
              <RolePill key={rid} roleId={rid} active={rid === u.roleId} onClick={() => setRole(u.id, rid)} />
            ))}
          </div>
        </div>

        {/* Stap 2 — Uitzonderingen (inklapbaar) */}
        <div>
          <button
            type="button"
            onClick={() => setOpenOverrides((o) => !o)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-bg-3"
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-bg-3 text-[11px] font-medium text-fg-2">2</span>
            <h4 className="text-[13px] font-medium text-fg-1">Aangepaste uitzonderingen</h4>
            {overrideFeatures.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] text-orange-500">
                {overrideFeatures.length}
              </span>
            )}
            <SvgIcon
              name="chevron-down"
              size={14}
              className={cn('ml-auto text-fg-3 transition-transform', EASE, openOverrides && 'rotate-180')}
            />
          </button>

          {openOverrides && (
            <div className="px-4 pb-4">
              <p className="mb-3 pl-7 text-[12px] text-fg-3">
                Wijk per onderdeel af van de rol. Alleen wat hier staat overschrijft de rol — al het andere volgt de basis.
              </p>

              {/* Bestaande overrides */}
              {overrideFeatures.length > 0 ? (
                <ul className="space-y-2">
                  {overrideFeatures.map((f) => {
                    const roleLevel = role.perms[f.id]
                    const userLevel = eff[f.id]
                    return (
                      <li
                        key={f.id}
                        className="flex flex-wrap items-center gap-3 rounded-lg border border-orange-500/30 bg-orange-500/[0.06] p-3"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-bg-3 text-fg-2">
                          <FeatureIcon id={f.id} size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] text-fg-1">{f.label}</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] text-orange-500">
                              <SvgIcon name="triangle-exclamation" size={10} />
                              afwijkend van rol
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-fg-3">
                            Rol geeft{' '}
                            <span className={levelMeta(roleLevel).tint}>{levelMeta(roleLevel).short.toLowerCase()}</span> ·
                            nu ingesteld op{' '}
                            <span className={levelMeta(userLevel).tint}>{levelMeta(userLevel).short.toLowerCase()}</span>
                          </p>
                        </div>
                        <LevelDropdown value={userLevel} onChange={(l) => setOverride(u.id, f.id, l)} />
                        <button
                          type="button"
                          title="Terug naar de rol"
                          onClick={() => setOverride(u.id, f.id, undefined)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-fg-3 transition-colors hover:bg-bg-3 hover:text-fg-1',
                            EASE,
                          )}
                        >
                          <SvgIcon name="refresh" size={12} />
                          Reset
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="rounded-lg border border-dashed border-border-subtle px-4 py-6 text-center">
                  <p className="text-[13px] text-fg-2">Geen uitzonderingen</p>
                  <p className="mt-0.5 text-[12px] text-fg-3">
                    {u.name.split(' ')[0]} volgt volledig de rol &ldquo;{role.name}&rdquo;.
                  </p>
                </div>
              )}

              {/* Toevoeg-rij */}
              <div className="mt-3 pt-1">
                {adding ? (
                  <AddOverrideRow
                    available={availableFeatures.map((f) => f.id)}
                    pick={pickFeature}
                    onPick={setPickFeature}
                    roleLevelOf={(f) => role.perms[f]}
                    onAdd={addOverride}
                    onCancel={() => {
                      setAdding(false)
                      setPickFeature('')
                    }}
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={availableFeatures.length === 0}
                    onClick={() => setAdding(true)}
                  >
                    <SvgIcon name="plus" size={14} />
                    Uitzondering toevoegen
                  </Button>
                )}
                {availableFeatures.length === 0 && !adding && (
                  <p className="mt-2 text-[11px] text-fg-3">Alle onderdelen hebben al een uitzondering.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Samenvatting: het effectieve resultaat */}
      <div className="mt-4 rounded-xl border border-border-subtle bg-bg-1 p-4">
        <div className="mb-3 flex items-center gap-2">
          <SvgIcon name="badge-check" size={14} className="text-fg-3" />
          <h4 className="text-[13px] font-medium text-fg-1">Effectieve toegang</h4>
          <span className="text-[12px] text-fg-3">— rol plus uitzonderingen samen</span>
        </div>
        <div className="space-y-4">
          {FEATURE_GROUPS.map((group) => {
            const items = FEATURES.filter((f) => f.group === group)
            return (
              <div key={group}>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-3">{group}</p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {items.map((f) => {
                    const lvl = eff[f.id]
                    const over = isOverridden(u, f.id)
                    return (
                      <div
                        key={f.id}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-2.5 py-1.5',
                          over ? 'border-orange-500/30 bg-orange-500/[0.06]' : 'border-border-subtle bg-bg-2',
                        )}
                      >
                        <FeatureIcon id={f.id} size={14} className="text-fg-3" />
                        <span className="flex-1 truncate text-[12px] text-fg-1">{f.label}</span>
                        {over && (
                          <span title="Afwijkend van de rol">
                            <SvgIcon name="triangle-exclamation" size={11} className="text-orange-500" />
                          </span>
                        )}
                        <LevelBadge level={lvl} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </VariantShell>
  )
}

// Inline rij om een nieuwe uitzondering te kiezen: feature-kiezer + niveau, dan toevoegen.
function AddOverrideRow({
  available,
  pick,
  onPick,
  roleLevelOf,
  onAdd,
  onCancel,
}: {
  available: FeatureId[]
  pick: FeatureId | ''
  onPick: (f: FeatureId | '') => void
  roleLevelOf: (f: FeatureId) => Level
  onAdd: (f: FeatureId, level: Level) => void
  onCancel: () => void
}) {
  // Default-niveau = wat de rol geeft, zodat het pas een echte uitzondering wordt als je iets kiest.
  const [level, setLevel] = React.useState<Level>(1)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (pick) setLevel(roleLevelOf(pick))
  }, [pick, roleLevelOf])

  React.useEffect(() => {
    if (!pickerOpen) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [pickerOpen])

  const selected = pick ? featureById(pick) : null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-strong bg-bg-1 p-3">
      {/* Feature-kiezer (eigen dropdown, geen portal → veilig binnen panelen) */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className={cn(
            'inline-flex min-w-44 items-center gap-2 rounded-md border border-border-subtle px-2.5 py-1.5 text-[12px] transition-colors hover:border-border-strong',
            EASE,
          )}
        >
          {selected ? (
            <>
              <FeatureIcon id={selected.id} size={14} className="text-fg-2" />
              <span className="text-fg-1">{selected.label}</span>
            </>
          ) : (
            <span className="text-fg-3">Kies een onderdeel…</span>
          )}
          <SvgIcon name="chevron-down" size={12} className="ml-auto text-fg-3" />
        </button>
        {pickerOpen && (
          <div className="absolute z-30 mt-1 max-h-64 w-56 overflow-auto rounded-lg border border-border-subtle bg-bg-2 p-1 shadow-lg">
            {available.length === 0 ? (
              <p className="px-2 py-2 text-[12px] text-fg-3">Geen onderdelen meer over.</p>
            ) : (
              available.map((id) => {
                const f = featureById(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      onPick(id)
                      setPickerOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg-3"
                  >
                    <FeatureIcon id={id} size={14} className="text-fg-2" />
                    <span className="flex flex-col">
                      <span className="text-[12px] text-fg-1">{f.label}</span>
                      <span className="text-[11px] text-fg-3">{f.desc}</span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      <LevelDropdown value={level} onChange={setLevel} />

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Annuleren
        </Button>
        <Button size="sm" disabled={!pick} onClick={() => pick && onAdd(pick, level)}>
          <SvgIcon name="check" size={14} />
          Toevoegen
        </Button>
      </div>
    </div>
  )
}
