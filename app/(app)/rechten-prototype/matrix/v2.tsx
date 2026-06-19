'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  FEATURE_GROUPS,
  FEATURES,
  FeatureIcon,
  LEVELS,
  LevelSelect,
  VariantShell,
  levelMeta,
  useRolesState,
  type FeatureGroup,
  type Level,
} from '../shared'

// ponytail: master-detail. Eén rol tegelijk bewerken houdt het rustig en leesbaar.
// Links de rollen-kolom, rechts per feature een rij met niveau-kiezer (echte state).

export default function Variant() {
  const { roles, setLevel } = useRolesState()
  const [selId, setSelId] = React.useState(roles[0]?.id)
  const role = roles.find((r) => r.id === selId) ?? roles[0]

  // Samenvatting per rol: hoeveel features op "Beheren" / "Geen".
  const summary = (perms: Record<string, Level>) => {
    let beheren = 0
    let geen = 0
    for (const f of FEATURES) {
      if (perms[f.id] === 3) beheren++
      if (perms[f.id] === 0) geen++
    }
    return { beheren, geen }
  }

  // Snelle acties: alles op één niveau zetten voor de geselecteerde rol.
  const setAll = (level: Level) => {
    if (!role) return
    for (const f of FEATURES) setLevel(role.id, f.id, level)
  }

  return (
    <VariantShell
      title="Rol-detail"
      blurb="Kies een rol links, stel z'n features rechts in."
      wide
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
        {/* ── Linker kolom: rollen ─────────────────────────────────────── */}
        <aside className="flex flex-col gap-1.5">
          <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-fg-3">
            Rollen
          </p>
          {roles.map((r) => {
            const s = summary(r.perms)
            const active = r.id === role?.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelId(r.id)}
                className={cn(
                  'group flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  EASE,
                  'duration-200',
                  active
                    ? 'border-border-strong bg-bg-2'
                    : 'border-border-subtle bg-bg-1 hover:bg-bg-3',
                )}
              >
                <span
                  className={cn(
                    'mt-1 size-2 shrink-0 rounded-full',
                    r.tint.replace('text-', 'bg-'),
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'truncate text-[13px] font-medium',
                        active ? 'text-fg-1' : 'text-fg-2 group-hover:text-fg-1',
                      )}
                    >
                      {r.name}
                    </span>
                    {r.system && (
                      <SvgIcon
                        name="badge-check"
                        size={12}
                        className="shrink-0 text-fg-3"
                      />
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-fg-3">
                    {r.desc}
                  </span>
                  <span className="mt-1.5 flex items-center gap-2 text-[11px] text-fg-3">
                    <span className="inline-flex items-center gap-1">
                      <SvgIcon
                        name="bolt"
                        size={11}
                        className="text-green-500"
                      />
                      {s.beheren} beheren
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <SvgIcon name="x" size={11} className="text-fg-3" />
                      {s.geen} geen
                    </span>
                  </span>
                </span>
                <SvgIcon
                  name="chevron-right"
                  size={14}
                  className={cn(
                    'mt-0.5 shrink-0 transition-colors',
                    active ? 'text-fg-2' : 'text-fg-3/0 group-hover:text-fg-3',
                  )}
                />
              </button>
            )
          })}
        </aside>

        {/* ── Rechter kolom: detail van de gekozen rol ─────────────────── */}
        {role && (
          <section className="overflow-hidden rounded-xl border border-border-subtle bg-bg-1">
            {/* Kop */}
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-bg-2 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex size-9 items-center justify-center rounded-lg',
                    role.bg,
                  )}
                >
                  <SvgIcon name="users" size={18} className={role.tint} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[14px] font-medium text-fg-1">
                      {role.name}
                    </h4>
                    {role.system && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-bg-3 px-1.5 py-0.5 text-[10px] text-fg-3">
                        <SvgIcon name="badge-check" size={10} />
                        Systeem
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-fg-3">{role.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="mr-1 text-[11px] text-fg-3">Alles:</span>
                <button
                  type="button"
                  onClick={() => setAll(0)}
                  className={cn(
                    'rounded-md border border-border-subtle px-2 py-1 text-[11px] text-fg-2 transition-colors hover:bg-bg-3 hover:text-fg-1',
                    EASE,
                  )}
                >
                  Geen
                </button>
                <button
                  type="button"
                  onClick={() => setAll(1)}
                  className={cn(
                    'rounded-md border border-border-subtle px-2 py-1 text-[11px] text-fg-2 transition-colors hover:bg-bg-3 hover:text-fg-1',
                    EASE,
                  )}
                >
                  Bekijken
                </button>
                <button
                  type="button"
                  onClick={() => setAll(3)}
                  className={cn(
                    'rounded-md border border-border-subtle px-2 py-1 text-[11px] text-fg-2 transition-colors hover:bg-bg-3 hover:text-fg-1',
                    EASE,
                  )}
                >
                  Beheren
                </button>
              </div>
            </header>

            {/* Feature-rijen, gegroepeerd */}
            <div className="divide-y divide-border-subtle">
              {FEATURE_GROUPS.map((group) => (
                <FeatureGroupBlock
                  key={group}
                  group={group}
                  perms={role.perms}
                  onSet={(f, l) => setLevel(role.id, f, l)}
                />
              ))}
            </div>

            {/* Legenda */}
            <footer className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-bg-2 px-4 py-2.5">
              {LEVELS.map((l) => (
                <span
                  key={l.value}
                  className="inline-flex items-center gap-1.5 text-[11px] text-fg-3"
                  title={l.desc}
                >
                  <SvgIcon name={l.icon} size={12} className={l.tint} />
                  <span className={l.tint}>{l.short}</span>
                  <span className="text-fg-3">— {l.desc}</span>
                </span>
              ))}
            </footer>
          </section>
        )}
      </div>
    </VariantShell>
  )
}

// Eén groep features als kop + rijen.
function FeatureGroupBlock({
  group,
  perms,
  onSet,
}: {
  group: FeatureGroup
  perms: Record<string, Level>
  onSet: (f: (typeof FEATURES)[number]['id'], l: Level) => void
}) {
  const items = FEATURES.filter((f) => f.group === group)
  return (
    <div>
      <p className="bg-bg-1 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-fg-3">
        {group}
      </p>
      <div>
        {items.map((f) => {
          const level = perms[f.id]
          const m = levelMeta(level)
          return (
            <div
              key={f.id}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg-2',
                EASE,
              )}
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-lg',
                  level === 0 ? 'bg-bg-3' : m.bg,
                )}
              >
                <FeatureIcon
                  id={f.id}
                  size={16}
                  className={level === 0 ? 'text-fg-3' : m.tint}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-fg-1">{f.label}</p>
                <p className="truncate text-[12px] text-fg-3">{f.desc}</p>
              </div>
              <LevelSelect
                value={level}
                onChange={(l) => onSet(f.id, l)}
                showLabels
                className="shrink-0"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
