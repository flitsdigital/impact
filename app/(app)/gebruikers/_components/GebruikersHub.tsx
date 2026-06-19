'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { type FeatureId, type Level, type RoleId } from '@/lib/permissions'
import { setRolePermission, setUserRole, setUserOverride, removeUserOverride, inviteUser, resendInvite, deleteUser } from '../actions'
import type { OverridesMap, RolePermsMap, TeamUser } from './types'
import { TeamCards } from './TeamCards'
import { GebruikerRechten } from './GebruikerRechten'
import { RolBeheer } from './RolBeheer'
import { InviteWizard } from './InviteWizard'

type Tab = 'team' | 'gebruiker' | 'rollen'

export function GebruikersHub({
  users: initialUsers,
  rolePerms: initialRolePerms,
  overrides: initialOverrides,
  canManage,
  currentUserId,
}: {
  users: TeamUser[]
  rolePerms: RolePermsMap
  overrides: OverridesMap
  canManage: boolean
  currentUserId: string | null
}) {
  const [, startTransition] = React.useTransition()

  // Lokale, optimistische staat is leidend tijdens de sessie; serverdata seedt alleen
  // de initiële render. Mutaties persisteren via server-actions (revalidatePath).
  const [users, setUsers] = React.useState(initialUsers)
  const [rolePerms, setRolePerms] = React.useState(initialRolePerms)
  const [overrides, setOverrides] = React.useState(initialOverrides)

  const [tab, setTab] = React.useState<Tab>('team')
  const [selectedId, setSelectedId] = React.useState<string | null>(currentUserId ?? initialUsers[0]?.id ?? null)
  const [inviteOpen, setInviteOpen] = React.useState(false)

  const selectedUser = users.find((u) => u.id === selectedId) ?? users[0] ?? null

  // Optimistische mutatie + revert-bij-fout.
  const run = (apply: () => void, revertFrom: () => void, action: () => Promise<void>, okMsg?: string) => {
    apply()
    startTransition(async () => {
      try {
        await action()
        if (okMsg) toast.success(okMsg)
      } catch (e) {
        revertFrom()
        toast.error(e instanceof Error ? e.message : 'Er ging iets mis')
      }
    })
  }

  const onSetRolePermission = (role: RoleId, feature: FeatureId, level: Level) => {
    const prev = rolePerms
    run(
      () => setRolePerms((p) => ({ ...p, [role]: { ...p[role], [feature]: level } })),
      () => setRolePerms(prev),
      () => setRolePermission(role, feature, level),
    )
  }
  const onSetUserRole = (userId: string, role: RoleId) => {
    const prev = users
    run(
      () => setUsers((us) => us.map((u) => (u.id === userId ? { ...u, role } : u))),
      () => setUsers(prev),
      () => setUserRole(userId, role),
    )
  }
  const onSetOverride = (userId: string, feature: FeatureId, level: Level) => {
    const prev = overrides
    run(
      () => setOverrides((o) => ({ ...o, [userId]: { ...(o[userId] ?? {}), [feature]: level } })),
      () => setOverrides(prev),
      () => setUserOverride(userId, feature, level),
    )
  }
  const onRemoveOverride = (userId: string, feature: FeatureId) => {
    const prev = overrides
    run(
      () => setOverrides((o) => {
        const next = { ...(o[userId] ?? {}) }
        delete next[feature]
        return { ...o, [userId]: next }
      }),
      () => setOverrides(prev),
      () => removeUserOverride(userId, feature),
    )
  }
  const onInvite = async (email: string, role: RoleId) => {
    await inviteUser(email, role)
    toast.success(`Uitnodiging verstuurd naar ${email}`)
    // Optimistisch tonen als 'uitgenodigd'; bij een volgende serverload vervangt de echte rij dit.
    setUsers((us) =>
      us.some((u) => u.email === email)
        ? us
        : [...us, { id: `pending-${email}`, name: email, email, avatar_url: null, role, status: 'uitgenodigd' }],
    )
  }
  const onResend = async (email: string, role: RoleId) => {
    try {
      await resendInvite(email, role)
      toast.success(`Nieuwe uitnodiging verstuurd naar ${email}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Versturen mislukt')
    }
  }
  const onDeleteUser = (userId: string) => {
    const prev = users
    const naam = users.find((u) => u.id === userId)?.name ?? 'Gebruiker'
    setUsers((us) => us.filter((u) => u.id !== userId))
    if (selectedId === userId) setSelectedId(currentUserId ?? prev.find((u) => u.id !== userId)?.id ?? null)
    startTransition(async () => {
      try {
        await deleteUser(userId)
        toast.success(`${naam} verwijderd`)
      } catch (e) {
        setUsers(prev)
        toast.error(e instanceof Error ? e.message : 'Verwijderen mislukt')
      }
    })
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-6 py-3">
        <div className="flex items-center gap-2">
          <SvgIcon name="smile" size={16} className="text-fg-3" />
          <h1 className="text-[14px] font-medium text-fg-1">Gebruikers &amp; rechten</h1>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            value={tab}
            onChange={(v) => setTab(v as Tab)}
            options={[
              { value: 'team', label: 'Team', icon: 'users' },
              { value: 'gebruiker', label: 'Per gebruiker', icon: 'user' },
              { value: 'rollen', label: 'Rollen', icon: 'badge-check' },
            ]}
          />
          {canManage && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <SvgIcon name="user-plus" size={14} /> Uitnodigen
            </Button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
        {tab === 'team' && (
          <TeamCards
            users={users}
            canManage={canManage}
            onOpenUser={(id) => { setSelectedId(id); setTab('gebruiker') }}
            onResend={onResend}
          />
        )}
        {tab === 'gebruiker' && (
          <GebruikerRechten
            user={selectedUser}
            users={users}
            rolePerms={rolePerms}
            overrides={overrides}
            canManage={canManage}
            currentUserId={currentUserId}
            onSelectUser={setSelectedId}
            onSetUserRole={onSetUserRole}
            onSetOverride={onSetOverride}
            onRemoveOverride={onRemoveOverride}
            onDeleteUser={onDeleteUser}
          />
        )}
        {tab === 'rollen' && (
          <RolBeheer rolePerms={rolePerms} canManage={canManage} onSetRolePermission={onSetRolePermission} />
        )}
      </div>

      {inviteOpen && (
        <InviteWizard open={inviteOpen} onOpenChange={setInviteOpen} rolePerms={rolePerms} onInvite={onInvite} />
      )}
    </div>
  )
}
