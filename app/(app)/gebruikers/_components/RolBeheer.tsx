'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { LevelSelect } from '@/components/ui/LevelSelect'
import {
  FEATURES, FEATURE_GROUPS, ROLE_IDS, roleMeta,
  type FeatureId, type Level, type RoleId,
} from '@/lib/permissions'
import type { RolePermsMap } from './types'

export function RolBeheer({
  rolePerms, canManage, onSetRolePermission,
}: {
  rolePerms: RolePermsMap
  canManage: boolean
  onSetRolePermission: (role: RoleId, f: FeatureId, level: Level) => void
}) {
  const [selected, setSelected] = React.useState<RoleId>('beheerder')
  const perms = rolePerms[selected]
  const beheren = FEATURES.filter((f) => perms[f.id] === 3).length

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 md:grid-cols-[220px_1fr]">
      {/* Rollen-lijst */}
      <div className="flex flex-col gap-1">
        {ROLE_IDS.map((r) => {
          const m = roleMeta(r)
          return (
            <button
              key={r}
              type="button"
              onClick={() => setSelected(r)}
              className={cn(
                'flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors ease-strong duration-200',
                selected === r ? 'border-border-strong bg-bg-2' : 'border-border-subtle hover:bg-bg-2',
              )}
            >
              <span className="flex items-center gap-1.5 text-[13px] text-fg-1">
                <span className={cn('size-1.5 rounded-full', m.tint.replace('text-', 'bg-'))} />
                {m.name}
              </span>
              <span className="text-[11px] text-fg-3">{m.description}</span>
            </button>
          )
        })}
      </div>

      {/* Rol-detail */}
      <div className="rounded-xl border border-border-subtle bg-bg-2 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-medium text-fg-1">{roleMeta(selected).name}</h3>
            <p className="text-[12px] text-fg-3">{beheren} van {FEATURES.length} features op Beheren</p>
          </div>
          {!canManage && <span className="text-[11px] text-fg-3">Alleen-lezen</span>}
        </div>

        <div className="flex flex-col gap-4">
          {FEATURE_GROUPS.map((g) => (
            <div key={g}>
              <p className="mb-1.5 text-[11px] font-medium tracking-wide text-fg-3 uppercase">{g}</p>
              <div className="flex flex-col gap-1.5">
                {FEATURES.filter((f) => f.group === g).map((f) => (
                  <div key={f.id} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-1 px-3 py-2">
                    <span className="grid size-7 shrink-0 place-content-center rounded-md bg-bg-3 text-fg-2">
                      <SvgIcon name={f.icon} size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-fg-1">{f.label}</p>
                      <p className="truncate text-[11px] text-fg-3">{f.desc}</p>
                    </div>
                    <LevelSelect
                      value={perms[f.id]}
                      onChange={(l) => onSetRolePermission(selected, f.id, l)}
                      disabled={!canManage}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
