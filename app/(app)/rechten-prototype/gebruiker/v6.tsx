'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Input } from '@/components/ui/Input'
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
  type FeatureGroup,
  type FeatureId,
  type Level,
  type User,
} from '../shared'

// ponytail: variant "Feature-kaarten + zoek". Doorzoekbaar rooster van kaarten,
// elk met effectief niveau + LevelSelect (setOverride). Filter op label + groep-chips.

type GroupFilter = 'alle' | FeatureGroup

export default function Variant() {
  const { users, setRole, setOverride } = useUsersState()
  const [userId, setUserId] = React.useState<string>(users[0].id)
  const [query, setQuery] = React.useState('')
  const [group, setGroup] = React.useState<GroupFilter>('alle')

  const user = users.find((u) => u.id === userId) ?? users[0]
  const role = roleById(user.roleId)
  const perms = effectivePerms(user)

  const visible = FEATURES.filter((f) => {
    const matchQuery = f.label.toLowerCase().includes(query.trim().toLowerCase())
    const matchGroup = group === 'alle' || f.group === group
    return matchQuery && matchGroup
  })

  const overrideCount = FEATURES.filter((f) => isOverridden(user, f.id)).length

  const resetAll = () => {
    for (const f of FEATURES) if (isOverridden(user, f.id)) setOverride(user.id, f.id, undefined)
  }

  const groupCount = (g: GroupFilter) =>
    g === 'alle' ? FEATURES.length : FEATURES.filter((f) => f.group === g).length

  return (
    <VariantShell title="Feature-kaarten + zoek" blurb="Doorzoekbaar rooster van feature-kaarten." wide>
      {/* Gebruiker kiezen */}
      <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
        {users.map((u) => (
          <UserChip key={u.id} user={u} active={u.id === userId} onClick={() => setUserId(u.id)} />
        ))}
      </div>

      {/* Kop: gekozen gebruiker + rolkiezer */}
      <div className="mb-3 rounded-xl border border-border-subtle bg-bg-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size={44} />
            <div>
              <p className="text-[14px] font-medium text-fg-1">{user.name}</p>
              <p className="text-[12px] text-fg-3">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] text-fg-3">Rol</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {['beheerder', 'manager', 'lid', 'lezer'].map((rid) => (
                <RolePill key={rid} roleId={rid} active={user.roleId === rid} onClick={() => setRole(user.id, rid)} />
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 border-t border-border-subtle pt-3 text-[12px] text-fg-3">
          <span className={role.tint}>{role.name}</span> — {role.desc}
        </p>
      </div>

      {/* Zoek + groep-filters + override-teller */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <SvgIcon name="magnifying-glass" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek op feature…"
            className="h-9 pl-8 pr-8 text-[13px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-fg-3 transition-colors hover:text-fg-1"
              aria-label="Zoekterm wissen"
            >
              <SvgIcon name="x" size={13} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-full bg-bg-0 p-0.5">
          {(['alle', ...FEATURE_GROUPS] as GroupFilter[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroup(g)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] transition-colors',
                EASE,
                group === g ? 'bg-secondary text-fg-1' : 'text-fg-2 hover:text-fg-1',
              )}
            >
              {g === 'alle' ? 'Alle' : g}
              <span className={cn('rounded-full px-1.5 text-[10px]', group === g ? 'bg-bg-0 text-fg-2' : 'text-fg-3')}>
                {groupCount(g)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Override-balk */}
      <div className="mb-3 flex items-center justify-between gap-2 text-[12px]">
        <span className="text-fg-3">
          {overrideCount === 0 ? (
            'Volledig volgens de rol — geen uitzonderingen.'
          ) : (
            <span className="inline-flex items-center gap-1.5 text-orange-500">
              <SvgIcon name="bolt" size={12} />
              {overrideCount} {overrideCount === 1 ? 'uitzondering' : 'uitzonderingen'} t.o.v. de rol
            </span>
          )}
        </span>
        {overrideCount > 0 && (
          <Button size="xs" variant="ghost" onClick={resetAll}>
            <SvgIcon name="refresh" size={12} /> Alles terug naar rol
          </Button>
        )}
      </div>

      {/* Rooster van feature-kaarten */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-subtle bg-bg-1 py-12 text-center">
          <SvgIcon name="magnifying-glass" size={22} className="text-fg-3" />
          <p className="text-[13px] text-fg-2">Geen features gevonden</p>
          <p className="text-[12px] text-fg-3">Pas je zoekterm of filter aan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((f) => (
            <FeatureCard
              key={f.id}
              user={user}
              feature={f.id}
              level={perms[f.id]}
              roleLevel={role.perms[f.id]}
              overridden={isOverridden(user, f.id)}
              onChange={(l) =>
                setOverride(user.id, f.id, l === role.perms[f.id] ? undefined : l)
              }
              onReset={() => setOverride(user.id, f.id, undefined)}
            />
          ))}
        </div>
      )}
    </VariantShell>
  )
}

function UserChip({ user, active, onClick }: { user: User; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-colors',
        EASE,
        active ? 'border-border-strong bg-bg-2' : 'border-border-subtle hover:bg-bg-2',
      )}
    >
      <Avatar name={user.name} size={24} />
      <span className={cn('text-[12px]', active ? 'text-fg-1' : 'text-fg-2')}>{user.name}</span>
    </button>
  )
}

function FeatureCard({
  user,
  feature,
  level,
  roleLevel,
  overridden,
  onChange,
  onReset,
}: {
  user: User
  feature: FeatureId
  level: Level
  roleLevel: Level
  overridden: boolean
  onChange: (l: Level) => void
  onReset: () => void
}) {
  const f = featureById(feature)
  const m = levelMeta(level)
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-bg-2 p-3.5 transition-colors',
        EASE,
        overridden ? 'border-orange-500/40' : 'border-border-subtle',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', m.bg, m.tint)}>
            <FeatureIcon id={feature} size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-fg-1">{f.label}</p>
            <p className="truncate text-[12px] text-fg-3">{f.desc}</p>
          </div>
        </div>
        {overridden && (
          <span
            title={`Wijkt af van de rol (${levelMeta(roleLevel).short})`}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[10px] text-orange-500"
          >
            <SvgIcon name="bolt" size={10} /> Afwijkend
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
        <span className={cn('text-[12px]', m.tint)}>{m.label}</span>
        <LevelSelect value={level} onChange={onChange} />
      </div>

      {overridden && (
        <button
          type="button"
          onClick={onReset}
          className={cn(
            'inline-flex items-center gap-1.5 self-start text-[11px] text-fg-3 transition-colors hover:text-fg-1',
            EASE,
          )}
        >
          <SvgIcon name="refresh" size={11} />
          Terug naar rol — {levelMeta(roleLevel).short}
        </button>
      )}
    </div>
  )
}
