'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  FEATURES,
  FeatureIcon,
  LEVELS,
  LevelDot,
  RolePill,
  ROLES,
  VariantShell,
  effectivePerms,
  isOverridden,
  levelMeta,
  roleById,
  useUsersState,
  type FeatureId,
  type Level,
} from '../shared'

// Mini-matrix rij — de gekozen gebruiker als één horizontale rij, feature = kolom.
// Cel = klik-om-te-cyclen niveau-control. Override = afwijkend van de rol -> gemarkeerd.

const cycle = (l: Level): Level => ((l + 1) % 4) as Level

export default function Variant() {
  const { users, setRole, setOverride } = useUsersState()
  const [selId, setSelId] = React.useState(users[1]?.id ?? users[0].id)
  const user = users.find((u) => u.id === selId) ?? users[0]

  const role = roleById(user.roleId)
  const perms = effectivePerms(user)
  const overrideCount = FEATURES.filter((f) => isOverridden(user, f.id)).length

  // Klik op een cel verhoogt het niveau. Wordt het weer gelijk aan de rol,
  // dan is het geen uitzondering meer -> override wissen, anders zetten.
  const bump = (f: FeatureId) => {
    const next = cycle(perms[f])
    setOverride(user.id, f, next === role.perms[f] ? undefined : next)
  }
  const resetAll = () => FEATURES.forEach((f) => setOverride(user.id, f.id, undefined))

  return (
    <VariantShell title="Mini-matrix rij" blurb="De gebruiker als één rij over alle features.">
      {/* Gebruiker kiezen */}
      <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
        {users.map((u) => {
          const active = u.id === selId
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => setSelId(u.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-colors',
                EASE,
                active ? 'border-border-strong bg-bg-2' : 'border-border-subtle text-fg-2 hover:bg-bg-3',
              )}
            >
              <Avatar name={u.name} size={22} />
              <span className={cn('text-[12px]', active ? 'text-fg-1' : 'text-fg-2')}>{u.name.split(' ')[0]}</span>
            </button>
          )
        })}
      </div>

      {/* Kaart met de actieve gebruiker */}
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-2">
        {/* Koptekst: wie bewerk ik */}
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={user.name} size={36} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-fg-1">{user.name}</p>
              <p className="truncate text-[12px] text-fg-3">{user.email}</p>
            </div>
          </div>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px]',
              role.bg,
              role.tint,
            )}
          >
            <span className={cn('size-1.5 rounded-full', role.tint.replace('text-', 'bg-'))} />
            {role.name}
          </span>
        </div>

        {/* De rij: feature-kolommen + klik-om-te-cyclen cellen */}
        <div className="overflow-x-auto">
          <div className="min-w-max p-3">
            {/* Kolomkoppen */}
            <div className="flex items-stretch gap-1.5">
              {FEATURES.map((f) => (
                <div key={f.id} className="flex w-[88px] flex-col items-center gap-1 px-1 pb-1.5">
                  <FeatureIcon id={f.id} size={15} className="text-fg-3" />
                  <span className="text-center text-[11px] leading-tight text-fg-3">{f.label}</span>
                </div>
              ))}
            </div>

            {/* Cellen — één rij voor deze gebruiker */}
            <div className="flex items-stretch gap-1.5">
              {FEATURES.map((f) => {
                const lvl = perms[f.id]
                const m = levelMeta(lvl)
                const overridden = isOverridden(user, f.id)
                return (
                  <button
                    key={f.id}
                    type="button"
                    title={`${f.label}: ${m.label}${overridden ? ' (afwijkend van rol)' : ''} — klik om te wijzigen`}
                    onClick={() => bump(f.id)}
                    className={cn(
                      'group relative flex w-[88px] flex-col items-center gap-1.5 rounded-lg border py-2.5 transition-colors',
                      EASE,
                      overridden ? 'border-orange-500/40 bg-bg-1' : 'border-border-subtle bg-bg-1 hover:border-border-strong',
                    )}
                  >
                    {overridden && (
                      <span
                        title="Uitzondering t.o.v. de rol"
                        className="absolute right-1.5 top-1.5 inline-flex size-3.5 items-center justify-center rounded-full bg-orange-500/15"
                      >
                        <SvgIcon name="triangle-exclamation" size={9} className="text-orange-500" />
                      </span>
                    )}
                    <span className={cn('flex size-7 items-center justify-center rounded-full', m.bg)}>
                      <SvgIcon name={m.icon} size={14} className={m.tint} />
                    </span>
                    <span className="flex items-center gap-1">
                      <LevelDot level={lvl} size={6} />
                      <span className={cn('text-[11px]', m.tint)}>{m.short}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Niveau-legenda onder de rij */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle pt-3">
              <span className="text-[11px] text-fg-3">Klik op een cel om het niveau te verhogen:</span>
              {LEVELS.map((l) => (
                <span key={l.value} className="inline-flex items-center gap-1.5 text-[11px]">
                  <SvgIcon name={l.icon} size={11} className={l.tint} />
                  <span className="text-fg-2">{l.short}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Voet: rolkiezer + reset */}
        <div className="flex flex-col gap-3 border-t border-border-subtle bg-bg-1 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] text-fg-2">Rol toewijzen</p>
            {overrideCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-orange-500">
                <SvgIcon name="triangle-exclamation" size={11} />
                {overrideCount} {overrideCount === 1 ? 'uitzondering' : 'uitzonderingen'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-fg-3">
                <SvgIcon name="circle-check" size={11} className="text-green-500" />
                Volgt rol exact
              </span>
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

          <div className="flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
            <p className="text-[11px] text-fg-3">
              {overrideCount > 0
                ? 'Cellen met een markering wijken af van de rol.'
                : 'Deze gebruiker heeft geen uitzonderingen.'}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={resetAll}
              disabled={overrideCount === 0}
              className={cn(overrideCount === 0 && 'opacity-50')}
            >
              <SvgIcon name="refresh" size={13} />
              Alles terug naar rol
            </Button>
          </div>
        </div>
      </div>
    </VariantShell>
  )
}
