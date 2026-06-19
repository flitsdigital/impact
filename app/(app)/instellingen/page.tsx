import { PageHeader } from "@/components/layout/PageHeader"
import { requireFeature } from "@/lib/permissions.server"
import { Card } from "@/components/ui/Card"
import { createAdminClient } from "@/lib/supabase/admin"
import { fmtDateTime } from "@/lib/dates"

// Service-role leest assistant_log / assistant_identities (RLS = default-deny;
// alleen de admin-client komt erbij). Server component → admin-import is veilig.
// Middleware borgt dat alleen ingelogde teamleden deze pagina bereiken.
export const dynamic = "force-dynamic"

type Identity = {
  telegram_user_id: string
  label: string | null
  created_at: string
  profiles: { full_name: string | null } | null
}

export default async function InstellingenPage() {
  await requireFeature('instellingen')
  const admin = createAdminClient()
  const { data: identitiesData } = await admin
    .from("assistant_identities")
    .select("telegram_user_id, label, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })

  const identities = (identitiesData ?? []) as unknown as Identity[]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Instellingen" iconName="settings" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[1000px] mx-auto w-full flex flex-col gap-6">
          {/* Assistent-koppelingen */}
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-medium text-fg-1">Assistent-koppelingen</h2>
              <p className="text-[13px] text-fg-3">
                Telegram-accounts die de AI-assistent mogen gebruiken. Koppelen gebeurt
                via de <code className="text-fg-2">assistant_identities</code>-tabel.
              </p>
            </div>
            {identities.length === 0 ? (
              <Card className="bg-bg-0 p-4">
                <p className="m-0 text-[13px] text-fg-3">Nog geen koppelingen.</p>
              </Card>
            ) : (
              <Card className="bg-bg-0 gap-0 p-0 overflow-hidden">
                {identities.map((it, i) => (
                  <div
                    key={it.telegram_user_id}
                    className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-border-subtle" : ""}`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-fg-1 truncate">
                        {it.profiles?.full_name ?? "Onbekend teamlid"}
                      </span>
                      <span className="text-[13px] text-fg-3 truncate">
                        {it.label ?? `Telegram #${it.telegram_user_id}`}
                      </span>
                    </div>
                    <span className="text-[13px] text-fg-3 shrink-0">
                      {fmtDateTime(it.created_at)}
                    </span>
                  </div>
                ))}
              </Card>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
