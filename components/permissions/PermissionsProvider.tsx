"use client"

import { createContext, useContext, useMemo } from "react"
import { makePerm, type FeatureId, type Level, type PermMap, type RoleId } from "@/lib/permissions"

interface PermissionsValue {
  role: RoleId
  perms: PermMap
  /** Heeft de huidige gebruiker minstens `min` op deze feature? */
  can: (feature: FeatureId, min?: Level) => boolean
}

const PermissionsContext = createContext<PermissionsValue | null>(null)

export function PermissionsProvider({
  role,
  perms,
  children,
}: {
  role: RoleId
  perms: PermMap
  children: React.ReactNode
}) {
  const value = useMemo<PermissionsValue>(
    () => ({ role, perms, can: (feature, min = 1) => (perms[feature] ?? 0) >= min }),
    [role, perms],
  )
  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

/** Effectieve rechten van de huidige gebruiker (client). */
export function usePermissions(): PermissionsValue {
  return useContext(PermissionsContext) ?? { role: "beheerder", perms: makePerm(3), can: () => true }
}
