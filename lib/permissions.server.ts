import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  effectivePerms,
  makePerm,
  ROLE_SEED,
  type FeatureId,
  type Level,
  type PermMap,
  type RoleId,
} from "@/lib/permissions"

/**
 * Effectieve rechten van de huidige gebruiker (rol-rechten + per-gebruiker
 * uitzonderingen), server-side bepaald. Per request gecachet via React `cache`.
 *
 * Vóór migratie 020 bestaan de tabellen/kolom nog niet → graceful fallback naar
 * volledige toegang (zoals de app zich nu gedraagt), zodat niets breekt totdat
 * de migratie is gedraaid.
 */
export const getMyPermissions = cache(async (): Promise<{ role: RoleId; perms: PermMap }> => {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { role: "lezer", perms: makePerm(0) }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    if (profileErr || !profile?.role) throw new Error("geen rol")

    const role = profile.role as RoleId

    const [{ data: rolePerms }, { data: overrides }] = await Promise.all([
      supabase.from("role_permissions").select("feature, level").eq("role", role),
      supabase.from("user_permission_overrides").select("feature, level").eq("user_id", user.id),
    ])

    const base = (rolePerms && rolePerms.length)
      ? { ...makePerm(0), ...Object.fromEntries(rolePerms.map((r) => [r.feature, r.level as Level])) } as PermMap
      : (ROLE_SEED[role] ?? makePerm(0))

    const ov = Object.fromEntries((overrides ?? []).map((o) => [o.feature, o.level as Level])) as Partial<PermMap>

    return { role, perms: effectivePerms(base, ov) }
  } catch {
    // Pre-migratie of leesfout → val terug op volledige toegang (huidige gedrag).
    return { role: "beheerder", perms: makePerm(3) }
  }
})

/** Server-guard voor een feature-pagina. Redirect bij onvoldoende niveau. */
export async function requireFeature(feature: FeatureId, minLevel: Level = 1): Promise<void> {
  const { perms } = await getMyPermissions()
  if ((perms[feature] ?? 0) < minLevel) redirect("/geen-toegang")
}
