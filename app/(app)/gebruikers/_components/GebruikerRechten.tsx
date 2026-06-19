'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { SearchInput } from '@/components/ui/SearchInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { LevelSelect } from '@/components/ui/LevelSelect'
import { RolePill } from '@/components/ui/RolePill'
import {
  FEATURES, FEATURE_GROUPS, ROLE_IDS, roleMeta,
  type FeatureGroup, type FeatureId, type Level, type RoleId,
} from '@/lib/permissions'
import type { OverridesMap, RolePermsMap, TeamUser } from './types'

export function GebruikerRechten({
  user, users, rolePerms, overrides, canManage, currentUserId,
  onSelectUser, onSetUserRole, onSetOverride, onRemoveOverride, onDeleteUser,
}: {
  user: TeamUser | null
  users: TeamUser[]
  rolePerms: RolePermsMap
  overrides: OverridesMap
  canManage: boolean
  currentUserId: string | null
  onSelectUser: (id: string) => void
  onSetUserRole: (id: string, role: RoleId) => void
  onSetOverride: (id: string, f: FeatureId, level: Level) => void
  onRemoveOverride: (id: string, f: FeatureId) => void
  onDeleteUser: (id: string) => void
}) {
  const [q, setQ] = React.useState('')
  const [group, setGroup] = React.useState<FeatureGroup | 'alle'>('alle')
  // Bevestiging gekoppeld aan een specifieke user-id → wisselen van gebruiker reset 'm vanzelf.
  const [confirmId, setConfirmId] = React.useState<string | null>(null)

  if (!user) return <p className="py-10 text-center text-[13px] text-fg-3">Geen gebruiker geselecteerd.</p>

  const base = rolePerms[user.role]
  const ov = overrides[user.id] ?? {}
  const overrideCount = Object.keys(ov).filter((f) => ov[f as FeatureId] !== base[f as FeatureId]).length

  const filtered = FEATURES.filter(
    (f) => (group === 'alle' || f.group === group) && f.label.toLowerCase().includes(q.trim().toLowerCase()),
  )

  const changeLevel = (f: FeatureId, level: Level) => {
    if (level === base[f]) onRemoveOverride(user.id, f)
    else onSetOverride(user.id, f, level)
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Gebruiker-kiezer */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {users.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => onSelectUser(u.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-[12px] transition-colors ease-strong duration-200',
              u.id === user.id ? 'border-border-strong bg-bg-3 text-fg-1' : 'border-border-subtle text-fg-2 hover:text-fg-1',
            )}
          >
            <Avatar name={u.name} src={u.avatar_url} size={20} />
            {u.name}
          </button>
        ))}
      </div>

      {/* Rol-kiezer voor deze gebruiker */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-bg-2 p-4">
        <Avatar name={user.name} src={user.avatar_url} size={36} />
        <div className="mr-auto">
          <p className="text-[13px] font-medium text-fg-1">{user.name}</p>
          <p className="text-[12px] text-fg-3">
            Rol: {roleMeta(user.role).name}
            {overrideCount > 0 && <span className="ml-1 text-orange-500">· {overrideCount} uitzondering{overrideCount > 1 ? 'en' : ''}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_IDS.map((r) => (
            <RolePill key={r} role={r} active={user.role === r} onClick={canManage ? () => onSetUserRole(user.id, r) : undefined} />
          ))}
        </div>
      </div>

      {/* Verwijderen (niet voor jezelf) */}
      {canManage && user.id !== currentUserId && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-2 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] text-fg-1">Gebruiker verwijderen</p>
            <p className="text-[11px] text-fg-3">Verwijdert {user.name} permanent. Dit kan niet ongedaan worden gemaakt.</p>
          </div>
          {confirmId === user.id ? (
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>Annuleer</Button>
              <Button size="sm" variant="destructive" onClick={() => { onDeleteUser(user.id); setConfirmId(null) }}>
                <SvgIcon name="trash" size={13} /> Definitief verwijderen
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="shrink-0 text-red-500" onClick={() => setConfirmId(user.id)}>
              <SvgIcon name="trash" size={13} /> Verwijderen
            </Button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Zoek een feature…" />
        <SegmentedControl
          value={group}
          onChange={(v) => setGroup(v as FeatureGroup | 'alle')}
          options={[{ value: 'alle', label: 'Alle' }, ...FEATURE_GROUPS.map((g) => ({ value: g, label: g }))]}
        />
      </div>

      {/* Feature-kaarten */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {filtered.map((f) => {
          const eff = (ov[f.id] ?? base[f.id]) as Level
          const isOv = ov[f.id] !== undefined && ov[f.id] !== base[f.id]
          return (
            <div
              key={f.id}
              className={cn('rounded-xl border bg-bg-2 p-3', isOv ? 'border-orange-500/40' : 'border-border-subtle')}
            >
              <div className="flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-content-center rounded-md bg-bg-3 text-fg-2">
                  <SvgIcon name={f.icon} size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-fg-1">{f.label}</p>
                  <p className="truncate text-[11px] text-fg-3">{f.desc}</p>
                </div>
                {isOv && (
                  <button
                    type="button"
                    onClick={() => onRemoveOverride(user.id, f.id)}
                    disabled={!canManage}
                    className="text-[11px] text-orange-500 hover:text-fg-1 disabled:opacity-50"
                    title="Terug naar rol"
                  >
                    <SvgIcon name="refresh" size={12} />
                  </button>
                )}
              </div>
              <div className="mt-2.5">
                <LevelSelect value={eff} onChange={(l) => changeLevel(f.id, l)} disabled={!canManage} showLabels />
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && <p className="col-span-full py-8 text-center text-[13px] text-fg-3">Geen features gevonden.</p>}
      </div>
    </div>
  )
}
