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
  type FeatureId,
  type Level,
  LevelBadge,
  LevelSelect,
  RolePill,
  roleById,
  effectivePerms,
  isOverridden,
  useUsersState,
  VariantShell,
  type User,
} from '../shared'

// Variant "Vergelijk met rol": twee kolommen naast elkaar — links de rol (read-only),
// rechts de effectieve rechten van de gebruiker (bewerkbaar). Verschillen krijgen een
// accent + pijl tussen de kolommen, zodat afwijkingen van de rol pijnlijk duidelijk zijn.

export default function Variant() {
  const { users, setRole, setOverride } = useUsersState()
  const [selId, setSelId] = React.useState(users[0]?.id ?? 'u1')
  const user = users.find((u) => u.id === selId) ?? users[0]
  const role = roleById(user.roleId)
  const eff = effectivePerms(user)

  const overriddenFeatures = FEATURES.filter((f) => isOverridden(user, f.id))
  const overrideCount = overriddenFeatures.length

  const resetAll = () => {
    for (const f of FEATURES) {
      if (isOverridden(user, f.id)) setOverride(user.id, f.id, undefined)
    }
  }

  return (
    <VariantShell
      title="Vergelijk met rol"
      blurb="Rol naast gebruiker, verschillen uitgelicht."
    >
      <div className="space-y-4">
        <UserPicker users={users} selId={selId} onSelect={setSelId} />

        <RoleHeader
          user={user}
          roleId={user.roleId}
          onRole={(rid) => setRole(user.id, rid)}
          overrideCount={overrideCount}
          onReset={resetAll}
        />

        <CompareTable
          user={user}
          rolePerms={role.perms}
          eff={eff}
          onOverride={(f, lvl) => {
            // Zet override alleen als-ie afwijkt van de rol; gelijk = override weg.
            if (lvl === role.perms[f]) setOverride(user.id, f, undefined)
            else setOverride(user.id, f, lvl)
          }}
        />
      </div>
    </VariantShell>
  )
}

// ── Gebruikerskiezer ─────────────────────────────────────────────────────────
function UserPicker({
  users,
  selId,
  onSelect,
}: {
  users: User[]
  selId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {users.map((u) => {
        const active = u.id === selId
        const ovr = u.overrides ? Object.keys(u.overrides).length : 0
        return (
          <button
            key={u.id}
            type="button"
            onClick={() => onSelect(u.id)}
            className={cn(
              'flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 text-[12px] transition-colors',
              EASE,
              active
                ? 'border-border-strong bg-bg-2 text-fg-1'
                : 'border-border-subtle text-fg-2 hover:text-fg-1',
            )}
          >
            <Avatar name={u.name} size={22} />
            <span>{u.name.split(' ')[0]}</span>
            {ovr > 0 && (
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-orange-500/15 text-[10px] text-orange-500">
                {ovr}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Kop met rol-keuze + reset ────────────────────────────────────────────────
function RoleHeader({
  user,
  roleId,
  onRole,
  overrideCount,
  onReset,
}: {
  user: User
  roleId: string
  onRole: (rid: string) => void
  overrideCount: number
  onReset: () => void
}) {
  const role = roleById(roleId)
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-1 p-4">
      <div className="flex items-start gap-3">
        <Avatar name={user.name} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-fg-1">{user.name}</p>
          <p className="text-[12px] text-fg-3">{user.email}</p>
        </div>
        <div className="text-right">
          {overrideCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-2.5 py-1 text-[12px] text-orange-500">
              <SvgIcon name="triangle-exclamation" size={12} />
              {overrideCount} {overrideCount === 1 ? 'afwijking' : 'afwijkingen'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-1 text-[12px] text-green-500">
              <SvgIcon name="badge-check" size={12} />
              Volgt de rol
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-fg-3">Rol</span>
          <div className="flex flex-wrap gap-1.5">
            {['beheerder', 'manager', 'lid', 'lezer'].map((rid) => (
              <RolePill
                key={rid}
                roleId={rid}
                active={rid === roleId}
                onClick={() => onRole(rid)}
              />
            ))}
          </div>
        </div>
        <Button
          variant={overrideCount > 0 ? 'secondary' : 'ghost'}
          size="sm"
          disabled={overrideCount === 0}
          onClick={onReset}
          className={cn(overrideCount > 0 && 'text-orange-500')}
        >
          <SvgIcon name="refresh" size={13} />
          Alles terug naar rol
        </Button>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-3">
        <span className={cn('size-1.5 rounded-full', role.tint.replace('text-', 'bg-'))} />
        {role.desc}
      </p>
    </div>
  )
}

// ── Vergelijkingstabel ───────────────────────────────────────────────────────
function CompareTable({
  user,
  rolePerms,
  eff,
  onOverride,
}: {
  user: User
  rolePerms: Record<FeatureId, Level>
  eff: Record<FeatureId, Level>
  onOverride: (f: FeatureId, lvl: Level) => void
}) {
  const role = roleById(user.roleId)
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle">
      {/* Kolomkoppen */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border-subtle bg-bg-1 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', role.tint.replace('text-', 'bg-'))} />
          <span className="text-[12px] text-fg-2">
            Rol: <span className={cn('font-medium', role.tint)}>{role.name}</span>
          </span>
        </div>
        <div className="w-8" />
        <div className="flex items-center justify-end gap-2 text-right">
          <span className="text-[12px] font-medium text-fg-1">Deze gebruiker</span>
          <SvgIcon name="pencil" size={11} className="text-fg-3" />
        </div>
      </div>

      {FEATURE_GROUPS.map((group) => {
        const feats = FEATURES.filter((f) => f.group === group)
        return (
          <div key={group}>
            <div className="bg-bg-0 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-3">
              {group}
            </div>
            {feats.map((f) => {
              const roleLvl = rolePerms[f.id]
              const userLvl = eff[f.id]
              const diff = isOverridden(user, f.id)
              return (
                <Row
                  key={f.id}
                  featureId={f.id}
                  label={f.label}
                  roleLvl={roleLvl}
                  userLvl={userLvl}
                  diff={diff}
                  onChange={(lvl) => onOverride(f.id, lvl)}
                  onResetRow={() => onOverride(f.id, roleLvl)}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function Row({
  featureId,
  label,
  roleLvl,
  userLvl,
  diff,
  onChange,
  onResetRow,
}: {
  featureId: FeatureId
  label: string
  roleLvl: Level
  userLvl: Level
  diff: boolean
  onChange: (lvl: Level) => void
  onResetRow: () => void
}) {
  // Wijst de override omhoog (ruimer) of omlaag (strenger) t.o.v. de rol?
  const direction = userLvl > roleLvl ? 'up' : userLvl < roleLvl ? 'down' : 'same'
  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border-subtle px-4 py-2.5 transition-colors last:border-0',
        EASE,
        diff && 'bg-orange-500/[0.06]',
      )}
    >
      {/* Linkerkolom: rol (read-only) */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-md bg-bg-2 text-fg-3',
          )}
        >
          <FeatureIcon id={featureId} size={14} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] text-fg-1">{label}</p>
          <div className="mt-0.5">
            <LevelBadge level={roleLvl} />
          </div>
        </div>
      </div>

      {/* Midden: connector / pijl */}
      <div className="flex w-8 items-center justify-center">
        {diff ? (
          <span
            title={direction === 'up' ? 'Ruimer dan de rol' : 'Strenger dan de rol'}
            className={cn(
              'flex size-6 items-center justify-center rounded-full',
              direction === 'up'
                ? 'bg-green-500/15 text-green-500'
                : 'bg-red-500/15 text-red-500',
            )}
          >
            <SvgIcon
              name={direction === 'up' ? 'chevron-up' : 'chevron-down'}
              size={14}
            />
          </span>
        ) : (
          <SvgIcon name="chevron-right" size={14} className="text-fg-3/40" />
        )}
      </div>

      {/* Rechterkolom: gebruiker (bewerkbaar) */}
      <div className="flex items-center justify-end gap-2">
        {diff && (
          <button
            type="button"
            title="Deze rij terug naar de rol"
            onClick={onResetRow}
            className={cn(
              'flex size-6 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-bg-3 hover:text-fg-1',
              EASE,
            )}
          >
            <SvgIcon name="refresh" size={12} />
          </button>
        )}
        <LevelSelect value={userLvl} onChange={onChange} />
      </div>
    </div>
  )
}
