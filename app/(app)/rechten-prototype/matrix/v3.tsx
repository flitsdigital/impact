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
  LevelDropdown,
  LevelSelect,
  RolePill,
  VariantShell,
  levelMeta,
  useRolesState,
  type FeatureGroup,
  type Level,
  type Role,
} from '../shared'

// ponytail: variant "Accordion per groep" — rol kiezen via pills, features gebundeld per
// domein in inklapbare secties. Per sectie een bulk-instel én een telsamenvatting.

const GROUP_META: Record<FeatureGroup, { icon: string; desc: string }> = {
  Werk: { icon: 'chart-kanban', desc: 'Dagelijkse uitvoering' },
  Klanten: { icon: 'users', desc: 'Relaties & omzet' },
  Systeem: { icon: 'settings', desc: 'Beheer & configuratie' },
}

function featuresOf(group: FeatureGroup) {
  return FEATURES.filter((f) => f.group === group)
}

/** Korte telsamenvatting per sectie, bijv. "3× Beheren · 1× Bekijken". */
function groupSummary(role: Role, group: FeatureGroup): { level: Level; count: number }[] {
  const counts = [0, 0, 0, 0]
  for (const f of featuresOf(group)) counts[role.perms[f.id]]++
  return LEVELS
    .map((l) => ({ level: l.value, count: counts[l.value] }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.level - a.level)
}

function Section({
  group,
  role,
  open,
  onToggle,
  onSetFeature,
  onSetGroup,
}: {
  group: FeatureGroup
  role: Role
  open: boolean
  onToggle: () => void
  onSetFeature: (f: (typeof FEATURES)[number]['id'], l: Level) => void
  onSetGroup: (l: Level) => void
}) {
  const feats = featuresOf(group)
  const meta = GROUP_META[group]
  const summary = groupSummary(role, group)

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-2">
      {/* Sectie-kop */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 px-4 py-3 transition-colors',
          EASE,
          open ? 'bg-bg-1' : 'hover:bg-bg-1',
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg bg-bg-3 text-fg-2 transition-transform',
              EASE,
            )}
          >
            <SvgIcon name={meta.icon} size={16} />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-fg-1">{group}</span>
              <span className="text-[11px] text-fg-3">· {feats.length} features</span>
            </span>
            {/* Telsamenvatting */}
            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {summary.map((s) => {
                const lm = levelMeta(s.level)
                return (
                  <span
                    key={s.level}
                    className={cn('inline-flex items-center gap-1 text-[11px]', lm.tint)}
                  >
                    <span className={cn('size-1.5 rounded-full', lm.tint.replace('text-', 'bg-'))} />
                    {s.count}× {lm.short}
                  </span>
                )
              })}
            </span>
          </span>
        </button>

        {/* Bulk-instel voor hele groep */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-[11px] text-fg-3 sm:inline">Hele groep:</span>
          <LevelDropdown
            value={feats.every((f) => role.perms[f.id] === role.perms[feats[0].id]) ? role.perms[feats[0].id] : 0}
            onChange={onSetGroup}
          />
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? 'Inklappen' : 'Uitklappen'}
            className="flex size-7 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-bg-3 hover:text-fg-1"
          >
            <SvgIcon
              name="chevron-down"
              size={16}
              className={cn('transition-transform', EASE, open && 'rotate-180')}
            />
          </button>
        </div>
      </div>

      {/* Inklapbare inhoud */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300',
          EASE,
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border-subtle">
            {feats.map((f) => {
              const lvl = role.perms[f.id]
              const lm = levelMeta(lvl)
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-3 border-b border-border-subtle px-4 py-2.5 last:border-0"
                >
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                      EASE,
                      lvl === 0 ? 'bg-bg-3 text-fg-3' : cn(lm.bg, lm.tint),
                    )}
                  >
                    <FeatureIcon id={f.id} size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-fg-1">{f.label}</p>
                    <p className="truncate text-[11px] text-fg-3">{f.desc}</p>
                  </div>
                  <LevelSelect
                    value={lvl}
                    onChange={(l) => onSetFeature(f.id, l)}
                    showLabels
                    className="shrink-0"
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Variant() {
  const { roles, setRoles, setLevel } = useRolesState()
  const [activeRoleId, setActiveRoleId] = React.useState(roles[1]?.id ?? roles[0].id)
  const [open, setOpen] = React.useState<Record<FeatureGroup, boolean>>({
    Werk: true,
    Klanten: true,
    Systeem: false,
  })

  const role = roles.find((r) => r.id === activeRoleId) ?? roles[0]

  const setGroup = (group: FeatureGroup, level: Level) =>
    setRoles((rs) =>
      rs.map((r) => {
        if (r.id !== activeRoleId) return r
        const perms = { ...r.perms }
        for (const f of featuresOf(group)) perms[f.id] = level
        return { ...r, perms }
      }),
    )

  const toggle = (group: FeatureGroup) => setOpen((o) => ({ ...o, [group]: !o[group] }))

  // Totaaltelling over alle features van de actieve rol.
  const totals = React.useMemo(() => {
    const c = [0, 0, 0, 0]
    for (const f of FEATURES) c[role.perms[f.id]]++
    return c
  }, [role])

  const allOpen = FEATURE_GROUPS.every((g) => open[g])

  return (
    <VariantShell
      title="Accordion per groep"
      blurb="Features gebundeld per domein, met bulk-instellen."
      wide
    >
      {/* Rolkiezer */}
      <div className="mb-4 rounded-xl border border-border-subtle bg-bg-2 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] text-fg-3">Rol bewerken</span>
          <button
            type="button"
            onClick={() =>
              setOpen(
                FEATURE_GROUPS.reduce(
                  (acc, g) => ({ ...acc, [g]: !allOpen }),
                  {} as Record<FeatureGroup, boolean>,
                ),
              )
            }
            className="inline-flex items-center gap-1 text-[12px] text-fg-3 transition-colors hover:text-fg-1"
          >
            <SvgIcon name={allOpen ? 'chevrons-right' : 'chevrons-left'} size={13} className="rotate-90" />
            {allOpen ? 'Alles inklappen' : 'Alles uitklappen'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <RolePill
              key={r.id}
              roleId={r.id}
              active={r.id === activeRoleId}
              onClick={() => setActiveRoleId(r.id)}
            />
          ))}
        </div>
        {/* Context van de actieve rol */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle pt-3">
          <p className="text-[12px] text-fg-2">{role.desc}</p>
          <div className="ml-auto flex items-center gap-3">
            {LEVELS.filter((l) => totals[l.value] > 0).map((l) => (
              <span key={l.value} className={cn('inline-flex items-center gap-1 text-[11px]', l.tint)}>
                <SvgIcon name={l.icon} size={11} />
                {totals[l.value]}× {l.short}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Accordion-secties */}
      <div className="space-y-3">
        {FEATURE_GROUPS.map((group) => (
          <Section
            key={group}
            group={group}
            role={role}
            open={open[group]}
            onToggle={() => toggle(group)}
            onSetFeature={(f, l) => setLevel(activeRoleId, f, l)}
            onSetGroup={(l) => setGroup(group, l)}
          />
        ))}
      </div>

      {/* Voet: legenda van niveaus */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border-subtle bg-bg-1 px-4 py-2.5">
        <span className="text-[11px] text-fg-3">Niveaus:</span>
        {LEVELS.map((l) => (
          <span key={l.value} className="inline-flex items-center gap-1.5 text-[11px] text-fg-2">
            <SvgIcon name={l.icon} size={12} className={l.tint} />
            <span className={l.tint}>{l.short}</span>
            <span className="text-fg-3">— {l.desc}</span>
          </span>
        ))}
      </div>
    </VariantShell>
  )
}
