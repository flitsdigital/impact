import type { PermMap, RoleId } from '@/lib/permissions'

export type UserStatus = 'actief' | 'uitgenodigd'

export type TeamUser = {
  id: string
  name: string
  email: string
  avatar_url: string | null
  role: RoleId
  status: UserStatus
}

export type RolePermsMap = Record<RoleId, PermMap>
export type OverridesMap = Record<string, Partial<PermMap>>
