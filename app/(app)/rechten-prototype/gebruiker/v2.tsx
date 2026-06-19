'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  FEATURES,
  FEATURE_GROUPS,
  FeatureIcon,
  ROLES,
  roleById,
  levelMeta,
  LevelSelect,
  RolePill,
  VariantShell,
  useUsersState,
  effectivePerms,
  isOverridden,
  type FeatureId,
  type Level,
} from '../shared'

// Variant "Effectieve-rechten tabel": één tabel met álle features en hun effectieve
// niveau voor de gekozen gebruiker. Inline LevelSelect zet een override; afwijkingen
// t.o.v. de rol krijgen een "Aangepast"-badge + herstel-actie. State via useUsersState.

export default function Variant() {
  const { users, setRole, setOverride } = useUsersState()
  const [selId, setSelId] = React.useState(users[0]?.id ?? '')
  const user = users.find((u) => u.id === selId) ?? users[0]

  const perms = effectivePerms(user)
  const role = roleById(user.roleId)

  const overriddenFeatures = React.useMemo(
    () => FEATURES.filter((f) => isOverridden(user, f.id)),
    [user],
  )
  const overrideCount = overriddenFeatures.length

  // Eén klik: alle afwijkingen wissen, terug naar de pure rol.
  const resetAll = () => {
    for (const f of overriddenFeatures) setOverride(user.id, f.id, undefined)
  }

  return (
    <VariantShell
      title="Effectieve-rechten tabel"
      blurb="Zie precies wat de gebruiker per feature mag."
    >
      {/* Gebruiker-kiezer */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {users.map((u) => {
          const r = roleById(u.roleId)
          const active = u.id === user.id
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => setSelId(u.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-[12px] transition-colors',
                EASE,
                active
                  ? 'bg-secondary text-fg-1'
                  : 'border border-border-subtle text-fg-2 hover:text-fg-1',
              )}
            >
              <Avatar name={u.name} size={20} />
              <span>{u.name.split(' ')[0]}</span>
              <span className={cn('size-1.5 rounded-full', r.tint.replace('text-', 'bg-'))} />
            </button>
          )
        })}
      </div>

      {/* Samenvattings-kop: gebruiker, rol-kiezer, #aangepast */}
      <div className="mb-3 rounded-xl border border-border-subtle bg-bg-2 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size={40} />
            <div>
              <p className="text-[14px] font-medium text-fg-1">{user.name}</p>
              <p className="text-[12px] text-fg-3">{user.email}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-fg-3">Afwijkingen</p>
            {overrideCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-2.5 py-1 text-[12px] text-orange-500">
                <span className="size-1.5 rounded-full bg-orange-500" />
                {overrideCount} aangepast
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-3 px-2.5 py-1 text-[12px] text-fg-3">
                <SvgIcon name="check" size={12} />
                Volgt de rol
              </span>
            )}
          </div>
        </div>

        {/* Rol-kiezer: wisselt rol én wist alle overrides (setRole) */}
        <div className="mt-4 border-t border-border-subtle pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] text-fg-2">Rol</p>
            {overrideCount > 0 && (
              <button
                type="button"
                onClick={resetAll}
                className={cn(
                  'inline-flex items-center gap-1 text-[12px] text-fg-3 transition-colors hover:text-fg-1',
                  EASE,
                )}
              >
                <SvgIcon name="refresh" size={12} />
                Alles herstellen naar rol
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {ROLES.map((r) => (
              <RolePill
                key={r.id}
                roleId={r.id}
                active={r.id === user.roleId}
                onClick={() => setRole(user.id, r.id)}
              />
            ))}
          </div>
          <p className="mt-2 text-[12px] text-fg-3">{role.desc}</p>
        </div>
      </div>

      {/* Effectieve-rechten tabel, gegroepeerd per featuregroep */}
      <div className="overflow-hidden rounded-xl border border-border-subtle">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-1 text-[11px] uppercase tracking-wide text-fg-3">
              <th className="px-4 py-2.5 font-medium">Feature</th>
              <th className="px-4 py-2.5 font-medium">Effectief niveau</th>
              <th className="w-[120px] px-4 py-2.5 text-right font-medium">Bron</th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_GROUPS.map((group) => {
              const inGroup = FEATURES.filter((f) => f.group === group)
              if (inGroup.length === 0) return null
              return (
                <React.Fragment key={group}>
                  <tr className="bg-bg-1/60">
                    <td colSpan={3} className="px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-3">
                      {group}
                    </td>
                  </tr>
                  {inGroup.map((f) => (
                    <FeatureRow
                      key={f.id}
                      featureId={f.id}
                      label={f.label}
                      desc={f.desc}
                      level={perms[f.id]}
                      roleLevel={role.perms[f.id]}
                      overridden={isOverridden(user, f.id)}
                      onChange={(lvl) => {
                        // Zelfde als rol → override weghalen; anders override zetten.
                        if (lvl === role.perms[f.id]) setOverride(user.id, f.id, undefined)
                        else setOverride(user.id, f.id, lvl)
                      }}
                      onReset={() => setOverride(user.id, f.id, undefined)}
                    />
                  ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11px] text-fg-3">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-orange-500" />
          Aangepast t.o.v. rol
        </span>
        {ROLES.find((r) => r.id === user.roleId) && (
          <span className="flex items-center gap-1.5">
            <span className={cn('size-1.5 rounded-full', role.tint.replace('text-', 'bg-'))} />
            Volgt rol {role.name}
          </span>
        )}
        <span className="ml-auto">
          Wijzig een niveau om een uitzondering te maken. Terug naar het rol-niveau wist de uitzondering.
        </span>
      </div>
    </VariantShell>
  )
}

function FeatureRow({
  featureId,
  label,
  desc,
  level,
  roleLevel,
  overridden,
  onChange,
  onReset,
}: {
  featureId: FeatureId
  label: string
  desc: string
  level: Level
  roleLevel: Level
  overridden: boolean
  onChange: (l: Level) => void
  onReset: () => void
}) {
  const m = levelMeta(level)
  const roleMeta = levelMeta(roleLevel)
  return (
    <tr
      className={cn(
        'border-b border-border-subtle transition-colors last:border-0 hover:bg-bg-3/40',
        EASE,
      )}
    >
      {/* Feature: icoon + label + (optioneel) aangepast-stip */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className={cn('relative flex size-7 items-center justify-center rounded-lg', m.bg)}>
            <FeatureIcon id={featureId} size={15} className={m.tint} />
            {overridden && (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-orange-500 ring-2 ring-bg-1" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] text-fg-1">{label}</p>
              {overridden && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[10px] text-orange-500">
                  Aangepast
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-fg-3">{desc}</p>
          </div>
        </div>
      </td>

      {/* Inline niveau-kiezer (zet override) */}
      <td className="px-4 py-2.5">
        <LevelSelect value={level} onChange={onChange} showLabels />
      </td>

      {/* Bron: ofwel "rol-niveau" ofwel herstel-actie */}
      <td className="px-4 py-2.5 text-right">
        {overridden ? (
          <button
            type="button"
            onClick={onReset}
            title={`Herstel naar rol-niveau: ${roleMeta.label}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-[11px] text-fg-2 transition-colors hover:border-border-strong hover:text-fg-1',
              EASE,
            )}
          >
            <SvgIcon name="refresh" size={11} />
            Herstel
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-fg-3">
            <SvgIcon name={roleMeta.icon} size={11} className={roleMeta.tint} />
            via rol
          </span>
        )}
      </td>
    </tr>
  )
}
