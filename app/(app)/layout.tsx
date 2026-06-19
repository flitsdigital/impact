import { AppShell } from "@/components/layout/AppShell"
import { PermissionsProvider } from "@/components/permissions/PermissionsProvider"
import { getMyPermissions } from "@/lib/permissions.server"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { role, perms } = await getMyPermissions()

  return (
    <PermissionsProvider role={role} perms={perms}>
      <AppShell>{children}</AppShell>
    </PermissionsProvider>
  )
}
