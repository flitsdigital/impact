'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { ActionMenu, RoleSelect, StatusBadge, TEAM, VariantBar, roleOf, type RoleId, type User } from './shared'

// ponytail: 3 layouts voor gebruikersbeheer. Acties muteren lokale state (mock).
// Rollen zijn 'echt' in het model; productie krijgt role-kolom + RLS (beheerder mag muteren).

type Variant = 'tabel' | 'kaarten' | 'detail'

function useTeam() {
  const [team, setTeam] = React.useState<User[]>(TEAM)
  const setRole = (id: string, role: RoleId) => setTeam((t) => t.map((u) => (u.id === id ? { ...u, role } : u)))
  const deactivate = (id: string) => setTeam((t) => t.map((u) => (u.id === id ? { ...u, status: u.status === 'inactief' ? 'actief' : 'inactief' } : u)))
  const remove = (id: string) => setTeam((t) => t.filter((u) => u.id !== id))
  return { team, setRole, deactivate, remove }
}

function actionsFor(u: User, t: ReturnType<typeof useTeam>) {
  return [
    ...(u.status === 'uitgenodigd' ? [{ label: 'Uitnodiging opnieuw sturen', icon: 'refresh', onClick: () => {} }] : []),
    { label: u.status === 'inactief' ? 'Heractiveren' : 'Deactiveren', icon: 'circle-pause', onClick: () => t.deactivate(u.id) },
    { label: 'Verwijderen', icon: 'trash', danger: true, onClick: () => t.remove(u.id) },
  ]
}

// 1. Tabel
function Tabel({ t }: { t: ReturnType<typeof useTeam> }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-1 text-[12px] text-fg-3">
            <th className="px-4 py-2.5 font-medium">Naam</th>
            <th className="px-4 py-2.5 font-medium">Rol</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Laatst actief</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {t.team.map((u) => (
            <tr key={u.id} className={cn('border-b border-border-subtle last:border-0', u.status === 'inactief' && 'opacity-50')}>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar name={u.name} size={28} />
                  <div>
                    <p className="text-[13px] text-fg-1">{u.name}</p>
                    <p className="text-[12px] text-fg-3">{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-2.5"><RoleSelect value={u.role} onChange={(r) => t.setRole(u.id, r)} /></td>
              <td className="px-4 py-2.5"><StatusBadge status={u.status} /></td>
              <td className="px-4 py-2.5 text-[12px] text-fg-3">{u.lastActive}</td>
              <td className="px-2 py-2.5"><ActionMenu items={actionsFor(u, t)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 2. Kaarten
function Kaarten({ t }: { t: ReturnType<typeof useTeam> }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {t.team.map((u) => (
        <div key={u.id} className={cn('rounded-xl border border-border-subtle bg-bg-2 p-4', u.status === 'inactief' && 'opacity-50')}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar name={u.name} size={40} />
              <div>
                <p className="text-[13px] font-medium text-fg-1">{u.name}</p>
                <p className="text-[12px] text-fg-3">{u.email}</p>
              </div>
            </div>
            <ActionMenu items={actionsFor(u, t)} />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
            <RoleSelect value={u.role} onChange={(r) => t.setRole(u.id, r)} />
            <StatusBadge status={u.status} />
          </div>
        </div>
      ))}
    </div>
  )
}

// 3. Lijst + detail
function Detail({ t }: { t: ReturnType<typeof useTeam> }) {
  const [sel, setSel] = React.useState(t.team[0]?.id)
  const u = t.team.find((x) => x.id === sel) ?? t.team[0]
  return (
    <div className="grid h-full grid-cols-[260px_1fr] overflow-hidden rounded-xl border border-border-subtle">
      <div className="overflow-auto border-r border-border-subtle bg-bg-1">
        {t.team.map((m) => (
          <button
            key={m.id}
            onClick={() => setSel(m.id)}
            className={cn('flex w-full items-center gap-2.5 border-b border-border-subtle px-3 py-2.5 text-left transition-colors hover:bg-bg-3', sel === m.id && 'bg-bg-3')}
          >
            <Avatar name={m.name} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-fg-1">{m.name}</p>
              <p className="truncate text-[12px] text-fg-3">{m.email}</p>
            </div>
            <SvgIcon name={m.status === 'uitgenodigd' ? 'user-clock' : m.status === 'inactief' ? 'circle-pause' : 'circle-check'} size={13} className={cn(m.status === 'actief' ? 'text-green-500' : m.status === 'uitgenodigd' ? 'text-orange-500' : 'text-fg-3')} />
          </button>
        ))}
      </div>
      {u && (
        <div className="bg-bg-2 p-6">
          <div className="flex items-center gap-3">
            <Avatar name={u.name} size={52} />
            <div>
              <p className="text-[16px] font-medium text-fg-1">{u.name}</p>
              <p className="text-[13px] text-fg-3">{u.email}</p>
            </div>
          </div>
          <dl className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <dt className="text-[13px] text-fg-2">Rol</dt>
              <dd><RoleSelect value={u.role} onChange={(r) => t.setRole(u.id, r)} /></dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[13px] text-fg-2">Status</dt>
              <dd><StatusBadge status={u.status} /></dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[13px] text-fg-2">Laatst actief</dt>
              <dd className="text-[13px] text-fg-1">{u.lastActive}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2 border-t border-border-subtle pt-5">
            {u.status === 'uitgenodigd' && <Button size="sm" variant="outline"><SvgIcon name="refresh" size={13} /> Opnieuw uitnodigen</Button>}
            <Button size="sm" variant="outline" onClick={() => t.deactivate(u.id)}><SvgIcon name="circle-pause" size={13} /> {u.status === 'inactief' ? 'Heractiveren' : 'Deactiveren'}</Button>
            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => t.remove(u.id)}><SvgIcon name="trash" size={13} /> Verwijderen</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Beheer() {
  const [v, setV] = React.useState<Variant>('tabel')
  const t = useTeam()
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-center">
        <VariantBar
          value={v}
          onChange={setV}
          options={[{ value: 'tabel', label: 'Tabel' }, { value: 'kaarten', label: 'Kaarten' }, { value: 'detail', label: 'Lijst + detail' }]}
        />
      </div>
      <div className="min-h-0 flex-1">
        {v === 'tabel' && <Tabel t={t} />}
        {v === 'kaarten' && <Kaarten t={t} />}
        {v === 'detail' && <Detail t={t} />}
      </div>
    </div>
  )
}
