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
  LevelSelect,
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
  type User,
} from '../shared'

// ponytail: per-gebruiker rechten als twee-koloms transfer. Klik = verplaats tussen
// "Heeft toegang" (niveau >= 1) en "Geen toegang" (niveau 0). State via setOverride.

export default function Variant() {
  const { users, setRole, setOverride } = useUsersState()
  const [selId, setSelId] = React.useState(users[0]?.id ?? '')
  const user = users.find((u) => u.id === selId) ?? users[0]

  return (
    <VariantShell
      title="Twee-koloms transfer"
      blurb="Sleep/verplaats features tussen toegang-buckets."
    >
      <div className="grid grid-cols-[200px_1fr] gap-4">
        <UserRail users={users} selId={user.id} onSelect={setSelId} />
        <Transfer user={user} setRole={setRole} setOverride={setOverride} />
      </div>
    </VariantShell>
  )
}

// ── Gebruikers-kolom links ────────────────────────────────────────────────────
function UserRail({
  users,
  selId,
  onSelect,
}: {
  users: User[]
  selId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-1">
      <p className="border-b border-border-subtle px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-fg-3">
        Gebruiker
      </p>
      <div className="p-1">
        {users.map((u) => {
          const r = roleById(u.roleId)
          const active = u.id === selId
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => onSelect(u.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors',
                EASE,
                active ? 'bg-bg-3' : 'hover:bg-bg-2',
              )}
            >
              <Avatar name={u.name} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-fg-1">{u.name}</p>
                <p className={cn('truncate text-[11px]', r.tint)}>{r.name}</p>
              </div>
              {active && (
                <span className="size-1.5 shrink-0 rounded-full bg-blue-500" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Transfer-paneel rechts ────────────────────────────────────────────────────
function Transfer({
  user,
  setRole,
  setOverride,
}: {
  user: User
  setRole: (id: string, roleId: string) => void
  setOverride: (id: string, f: FeatureId, level: Level | undefined) => void
}) {
  const perms = effectivePerms(user)
  const role = roleById(user.roleId)
  const baseLevel = (f: FeatureId): Level => role.perms[f]

  const granted = FEATURES.filter((f) => perms[f.id] >= 1)
  const blocked = FEATURES.filter((f) => perms[f.id] === 0)

  // Verplaats naar "Heeft toegang": zet override op 1 (Bekijken) als rol 0 zegt,
  // anders herstel naar rol-niveau. Verplaats naar "Geen toegang": override 0.
  const grant = (f: FeatureId) => {
    const base = baseLevel(f)
    setOverride(user.id, f, base >= 1 ? undefined : 1)
  }
  const revoke = (f: FeatureId) => {
    setOverride(user.id, f, baseLevel(f) === 0 ? undefined : 0)
  }
  const setLevel = (f: FeatureId, lvl: Level) => {
    setOverride(user.id, f, lvl === baseLevel(f) ? undefined : lvl)
  }

  const overrideCount = FEATURES.filter((f) => isOverridden(user, f.id)).length

  const grantAll = () => {
    for (const f of FEATURES) {
      if (perms[f.id] === 0) grant(f.id)
    }
  }
  const revokeAll = () => {
    for (const f of FEATURES) {
      if (perms[f.id] >= 1) revoke(f.id)
    }
  }
  const resetOverrides = () => {
    for (const f of FEATURES) {
      if (isOverridden(user, f.id)) setOverride(user.id, f.id, undefined)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-1">
      {/* Kop: gebruiker + rol */}
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={user.name} size={34} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-fg-1">{user.name}</p>
            <p className="truncate text-[11px] text-fg-3">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {overrideCount > 0 && (
            <Button variant="ghost" size="xs" className="text-fg-3" onClick={resetOverrides}>
              <SvgIcon name="refresh" size={12} />
              Herstel{' '}
              <span className="ml-0.5 rounded-full bg-orange-500/15 px-1.5 text-[11px] text-orange-500">
                {overrideCount}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Rol-kiezer */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border-subtle bg-bg-0/40 px-4 py-2.5">
        <span className="mr-1 text-[11px] text-fg-3">Rol als basis:</span>
        {['beheerder', 'manager', 'lid', 'lezer'].map((rid) => (
          <RolePill
            key={rid}
            roleId={rid}
            active={user.roleId === rid}
            onClick={() => setRole(user.id, rid)}
          />
        ))}
      </div>

      {/* Twee kolommen */}
      <div className="grid grid-cols-2 divide-x divide-border-subtle">
        {/* Heeft toegang */}
        <Column
          tone="grant"
          title="Heeft toegang"
          icon="circle-check"
          count={granted.length}
          empty="Geen enkele feature toegankelijk — kies rechts iets om vrij te geven."
          actionLabel="Alles intrekken"
          onAction={granted.length ? revokeAll : undefined}
        >
          {FEATURE_GROUPS.map((group) => {
            const items = granted.filter((f) => f.group === group)
            if (!items.length) return null
            return (
              <GroupBlock key={group} group={group}>
                {items.map((f) => (
                  <GrantedRow
                    key={f.id}
                    feature={f.id}
                    level={perms[f.id]}
                    overridden={isOverridden(user, f.id)}
                    onLevel={(lvl) => setLevel(f.id, lvl)}
                    onRevoke={() => revoke(f.id)}
                  />
                ))}
              </GroupBlock>
            )
          })}
        </Column>

        {/* Geen toegang */}
        <Column
          tone="block"
          title="Geen toegang"
          icon="x"
          count={blocked.length}
          empty="Alles is vrijgegeven."
          actionLabel="Alles toestaan"
          onAction={blocked.length ? grantAll : undefined}
        >
          {FEATURE_GROUPS.map((group) => {
            const items = blocked.filter((f) => f.group === group)
            if (!items.length) return null
            return (
              <GroupBlock key={group} group={group}>
                {items.map((f) => (
                  <BlockedRow
                    key={f.id}
                    feature={f.id}
                    overridden={isOverridden(user, f.id)}
                    onGrant={() => grant(f.id)}
                  />
                ))}
              </GroupBlock>
            )
          })}
        </Column>
      </div>

      {/* Voet: legenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle px-4 py-2.5 text-[11px] text-fg-3">
        <span className="inline-flex items-center gap-1.5">
          <SvgIcon name="corner-down-right" size={12} className="text-fg-3" />
          Klik een feature om hem te verplaatsen
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-orange-500" />
          Wijkt af van de rol
        </span>
      </div>
    </div>
  )
}

// ── Kolom-omhulsel ────────────────────────────────────────────────────────────
function Column({
  tone,
  title,
  icon,
  count,
  empty,
  actionLabel,
  onAction,
  children,
}: {
  tone: 'grant' | 'block'
  title: string
  icon: string
  count: number
  empty: string
  actionLabel: string
  onAction?: () => void
  children: React.ReactNode
}) {
  const accent = tone === 'grant' ? 'text-green-500' : 'text-fg-3'
  const accentBg = tone === 'grant' ? 'bg-green-500/15' : 'bg-bg-3'
  return (
    <div className="flex min-h-[360px] flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <SvgIcon name={icon} size={13} className={accent} />
          <span className="text-[12px] font-medium text-fg-1">{title}</span>
          <span className={cn('rounded-full px-1.5 text-[11px]', accentBg, accent)}>
            {count}
          </span>
        </div>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className={cn('text-[11px] text-fg-3 transition-colors hover:text-fg-1', EASE)}
          >
            {actionLabel}
          </button>
        )}
      </div>
      <div className="flex-1 space-y-3 overflow-auto px-2 pb-3">
        {count === 0 ? (
          <p className="px-2 pt-6 text-center text-[12px] text-fg-3">{empty}</p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function GroupBlock({ group, children }: { group: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-fg-3">
        {group}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

// ── Rij in "Heeft toegang" ────────────────────────────────────────────────────
function GrantedRow({
  feature,
  level,
  overridden,
  onLevel,
  onRevoke,
}: {
  feature: FeatureId
  level: Level
  overridden: boolean
  onLevel: (l: Level) => void
  onRevoke: () => void
}) {
  const f = featureById(feature)
  const m = levelMeta(level)
  return (
    <div
      className={cn(
        'group rounded-lg border bg-bg-2 px-2.5 py-2 transition-colors',
        EASE,
        overridden ? 'border-orange-500/40' : 'border-border-subtle hover:border-border-strong',
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', m.bg)}>
          <FeatureIcon id={feature} size={15} className={m.tint} />
        </span>
        <button
          type="button"
          onClick={onRevoke}
          title="Klik om toegang in te trekken"
          className="min-w-0 flex-1 text-left"
        >
          <p className="flex items-center gap-1.5 truncate text-[13px] text-fg-1">
            {f.label}
            {overridden && <span className="size-1.5 shrink-0 rounded-full bg-orange-500" />}
          </p>
          <p className="truncate text-[11px] text-fg-3">{m.desc}</p>
        </button>
        <button
          type="button"
          onClick={onRevoke}
          title="Naar Geen toegang"
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-md text-fg-3 opacity-0 transition-all hover:bg-bg-3 hover:text-red-500 group-hover:opacity-100',
            EASE,
          )}
        >
          <SvgIcon name="chevron-right" size={14} />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 pl-9">
        <LevelSelect value={level} onChange={onLevel} showLabels />
      </div>
    </div>
  )
}

// ── Rij in "Geen toegang" ─────────────────────────────────────────────────────
function BlockedRow({
  feature,
  overridden,
  onGrant,
}: {
  feature: FeatureId
  overridden: boolean
  onGrant: () => void
}) {
  const f = featureById(feature)
  return (
    <button
      type="button"
      onClick={onGrant}
      title="Naar Heeft toegang"
      className={cn(
        'group flex w-full items-center gap-2 rounded-lg border bg-bg-2/60 px-2.5 py-2 text-left transition-colors',
        EASE,
        overridden ? 'border-orange-500/40' : 'border-border-subtle hover:border-border-strong hover:bg-bg-2',
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onGrant()
        }}
        title="Naar Heeft toegang"
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-md text-fg-3 opacity-0 transition-all hover:bg-bg-3 hover:text-green-500 group-hover:opacity-100',
          EASE,
        )}
      >
        <SvgIcon name="chevron-left" size={14} />
      </button>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-bg-3">
        <FeatureIcon id={feature} size={15} className="text-fg-3" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[13px] text-fg-2">
          {f.label}
          {overridden && <span className="size-1.5 shrink-0 rounded-full bg-orange-500" />}
        </p>
        <p className="truncate text-[11px] text-fg-3">{f.desc}</p>
      </div>
      <SvgIcon name="plus" size={13} className="shrink-0 text-fg-3 transition-colors group-hover:text-green-500" />
    </button>
  )
}
