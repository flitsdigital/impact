'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { RolePill } from '@/components/ui/RolePill'
import type { RoleId } from '@/lib/permissions'
import type { TeamUser } from './types'

function StatusLabel({ status }: { status: TeamUser['status'] }) {
  const meta =
    status === 'uitgenodigd'
      ? { icon: 'user-clock', tint: 'text-orange-500', label: 'Uitgenodigd' }
      : { icon: 'badge-check', tint: 'text-green-500', label: 'Actief' }
  return (
    <span className={cn('inline-flex items-center gap-1 text-[12px]', meta.tint)}>
      <SvgIcon name={meta.icon} size={13} />
      {meta.label}
    </span>
  )
}

function UserCard({
  user, canManage, onOpenUser, onResend,
}: {
  user: TeamUser
  canManage: boolean
  onOpenUser: (id: string) => void
  onResend: (email: string, role: RoleId) => Promise<void>
}) {
  const [busy, setBusy] = React.useState(false)
  const open = () => onOpenUser(user.id)
  const resend = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setBusy(true)
    try { await onResend(user.email, user.role) } finally { setBusy(false) }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
      className="flex cursor-pointer flex-col gap-3 rounded-xl border border-border-subtle bg-bg-2 p-4 text-left transition-colors ease-strong duration-200 hover:border-border-strong focus-visible:border-border-strong focus-visible:outline-none"
    >
      <div className="flex items-center gap-2.5">
        <Avatar name={user.name} src={user.avatar_url} size={40} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-fg-1">{user.name}</p>
          <p className="truncate text-[12px] text-fg-3">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border-subtle pt-3">
        <RolePill role={user.role} active />
        <StatusLabel status={user.status} />
      </div>
      {user.status === 'uitgenodigd' && canManage && (
        <button
          type="button"
          onClick={resend}
          disabled={busy}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-bg-1 py-1.5 text-[12px] text-fg-2 transition-colors hover:text-fg-1 disabled:opacity-50"
        >
          <SvgIcon name={busy ? 'circle-notch' : 'refresh'} size={13} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Versturen…' : 'Opnieuw uitnodigen'}
        </button>
      )}
    </div>
  )
}

export function TeamCards({
  users, canManage, onOpenUser, onResend,
}: {
  users: TeamUser[]
  canManage: boolean
  onOpenUser: (id: string) => void
  onResend: (email: string, role: RoleId) => Promise<void>
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {users.map((u) => (
        <UserCard key={u.id} user={u} canManage={canManage} onOpenUser={onOpenUser} onResend={onResend} />
      ))}
      {users.length === 0 && (
        <p className="col-span-full py-10 text-center text-[13px] text-fg-3">Nog geen teamleden.</p>
      )}
    </div>
  )
}
