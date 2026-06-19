import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyPermissions, requireFeature } from '@/lib/permissions.server'
import { ROLE_IDS, ROLE_SEED, makePerm, type Level, type PermMap, type RoleId } from '@/lib/permissions'
import { GebruikersHub } from './_components/GebruikersHub'
import type { OverridesMap, RolePermsMap, TeamUser, UserStatus } from './_components/types'

export const dynamic = 'force-dynamic'

export default async function GebruikersPage() {
  await requireFeature('gebruikers', 1)

  const supabase = await createClient()
  const { perms } = await getMyPermissions()
  const canManage = (perms.gebruikers ?? 0) >= 3

  const { data: { user: me } } = await supabase.auth.getUser()

  const [{ data: profiles }, { data: rolePermRows }, { data: overrideRows }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url, email, role').order('full_name'),
    supabase.from('role_permissions').select('role, feature, level'),
    supabase.from('user_permission_overrides').select('user_id, feature, level'),
  ])

  // Rol-rechten: start bij de seed, overlay met DB-waarden.
  const rolePerms = {} as RolePermsMap
  for (const r of ROLE_IDS) rolePerms[r] = { ...(ROLE_SEED[r] ?? makePerm(0)) }
  for (const row of rolePermRows ?? []) {
    const r = row.role as RoleId
    if (rolePerms[r]) rolePerms[r][row.feature as keyof PermMap] = row.level as Level
  }

  // Overrides per gebruiker.
  const overrides: OverridesMap = {}
  for (const row of overrideRows ?? []) {
    ;(overrides[row.user_id] ??= {})[row.feature as keyof PermMap] = row.level as Level
  }

  // Status (uitgenodigd vs actief) afleiden uit auth — admin-client; faalt stil terug op actief.
  const statusById = new Map<string, UserStatus>()
  try {
    const admin = createAdminClient()
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
    for (const u of list?.users ?? []) {
      const invited = !!u.invited_at && !u.last_sign_in_at
      statusById.set(u.id, invited ? 'uitgenodigd' : 'actief')
    }
  } catch {
    /* geen admin → alles actief */
  }

  const users: TeamUser[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name ?? p.email ?? '—',
    email: p.email ?? '—',
    avatar_url: p.avatar_url ?? null,
    role: (p.role as RoleId) ?? 'lid',
    status: statusById.get(p.id) ?? 'actief',
  }))

  return (
    <GebruikersHub
      users={users}
      rolePerms={rolePerms}
      overrides={overrides}
      canManage={canManage}
      currentUserId={me?.id ?? null}
    />
  )
}
