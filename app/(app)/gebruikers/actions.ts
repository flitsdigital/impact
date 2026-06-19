'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyPermissions } from '@/lib/permissions.server'
import { FEATURE_IDS, ROLE_IDS, type FeatureId, type Level, type RoleId } from '@/lib/permissions'

// Alleen wie 'gebruikers' mag beheren (niveau 3) mag muteren. RLS dwingt dit ook
// af op de tabellen; voor de invite (admin-client = RLS-bypass) is deze check de bron.
async function assertCanManage() {
  const { perms } = await getMyPermissions()
  if ((perms.gebruikers ?? 0) < 3) throw new Error('Geen rechten om gebruikers te beheren.')
}

function validFeature(f: string): f is FeatureId {
  return (FEATURE_IDS as string[]).includes(f)
}
function validRole(r: string): r is RoleId {
  return (ROLE_IDS as string[]).includes(r)
}
function validLevel(l: number): l is Level {
  return l === 0 || l === 1 || l === 2 || l === 3
}

export async function setRolePermission(role: string, feature: string, level: number) {
  await assertCanManage()
  if (!validRole(role) || !validFeature(feature) || !validLevel(level)) throw new Error('Ongeldige invoer.')
  const supabase = await createClient()
  const { error } = await supabase
    .from('role_permissions')
    .upsert({ role, feature, level, updated_at: new Date().toISOString() }, { onConflict: 'role,feature' })
  if (error) throw new Error(error.message)
  revalidatePath('/gebruikers')
}

export async function setUserRole(userId: string, role: string) {
  await assertCanManage()
  if (!validRole(role)) throw new Error('Ongeldige rol.')
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/gebruikers')
}

export async function setUserOverride(userId: string, feature: string, level: number) {
  await assertCanManage()
  if (!validFeature(feature) || !validLevel(level)) throw new Error('Ongeldige invoer.')
  const supabase = await createClient()
  const { error } = await supabase
    .from('user_permission_overrides')
    .upsert({ user_id: userId, feature, level, updated_at: new Date().toISOString() }, { onConflict: 'user_id,feature' })
  if (error) throw new Error(error.message)
  revalidatePath('/gebruikers')
}

export async function removeUserOverride(userId: string, feature: string) {
  await assertCanManage()
  if (!validFeature(feature)) throw new Error('Ongeldige feature.')
  const supabase = await createClient()
  const { error } = await supabase
    .from('user_permission_overrides')
    .delete()
    .eq('user_id', userId)
    .eq('feature', feature)
  if (error) throw new Error(error.message)
  revalidatePath('/gebruikers')
}

async function inviteOrigin() {
  const h = await headers()
  return process.env.NEXT_PUBLIC_SITE_URL
    ?? `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`
}

export async function inviteUser(email: string, role: string) {
  await assertCanManage()
  const clean = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Ongeldig e-mailadres.')
  if (!validRole(role)) throw new Error('Ongeldige rol.')

  const origin = await inviteOrigin()
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(clean, {
    data: { role },
    redirectTo: `${origin}/welkom`,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/gebruikers')
}

/** Verwijdert een gebruiker volledig (auth + profiel via cascade). Onomkeerbaar. */
export async function deleteUser(userId: string) {
  await assertCanManage()
  const supabase = await createClient()
  const { data: { user: me } } = await supabase.auth.getUser()
  if (me?.id === userId) throw new Error('Je kunt je eigen account niet verwijderen.')

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)
  revalidatePath('/gebruikers')
}

/**
 * Stuurt een openstaande uitnodiging opnieuw. Supabase's inviteUserByEmail faalt
 * voor bestaande gebruikers en generateLink mailt zelf niet — dus we verwijderen
 * de nog-niet-geaccepteerde uitnodiging en nodigen opnieuw uit. Harde guard:
 * een gebruiker die al ingelogd/bevestigd is wordt NOOIT verwijderd.
 */
export async function resendInvite(email: string, role: string) {
  await assertCanManage()
  const clean = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Ongeldig e-mailadres.')
  if (!validRole(role)) throw new Error('Ongeldige rol.')

  const admin = createAdminClient()
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) throw new Error(listErr.message)

  const existing = list?.users?.find((u) => u.email?.toLowerCase() === clean)
  if (existing && (existing.last_sign_in_at || existing.email_confirmed_at)) {
    throw new Error('Deze gebruiker is al actief — opnieuw uitnodigen is niet nodig.')
  }
  if (existing) {
    const { error: delErr } = await admin.auth.admin.deleteUser(existing.id)
    if (delErr) throw new Error(delErr.message)
  }

  const origin = await inviteOrigin()
  const { error } = await admin.auth.admin.inviteUserByEmail(clean, {
    data: { role },
    redirectTo: `${origin}/welkom`,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/gebruikers')
}
