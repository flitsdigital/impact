import { PageHeader } from "@/components/layout/PageHeader"
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

type LogRow = {
  id: string
  input_text: string
  reply_text: string | null
  tool_calls: { name: string; input: unknown }[] | null
  created_at: string
  profiles: { full_name: string | null } | null
}

export default async function InstellingenPage() {
  const admin = createAdminClient()
  const [identitiesRes, logsRes] = await Promise.all([
    admin
      .from("assistant_identities")
      .select("telegram_user_id, label, created_at, profiles(full_name)")
      .order("created_at", { ascending: false }),
    admin
      .from("assistant_log")
      .select("id, input_text, reply_text, tool_calls, created_at, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  const identities = (identitiesRes.data ?? []) as unknown as Identity[]
  const logs = (logsRes.data ?? []) as unknown as LogRow[]

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

          {/* Assistent-logboek */}
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-medium text-fg-1">Assistent-logboek</h2>
              <p className="text-[13px] text-fg-3">Laatste 50 interacties met de AI-assistent.</p>
            </div>
            {logs.length === 0 ? (
              <Card className="bg-bg-0 p-4">
                <p className="m-0 text-[13px] text-fg-3">Nog geen interacties.</p>
              </Card>
            ) : (
              <Card className="bg-bg-0 gap-0 p-0 overflow-hidden">
                {logs.map((log, i) => (
                  <div
                    key={log.id}
                    className={`flex flex-col gap-1 px-4 py-3 ${i > 0 ? "border-t border-border-subtle" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-fg-2 truncate">
                        {log.profiles?.full_name ?? "Onbekend"}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {log.tool_calls && log.tool_calls.length > 0 ? (
                          <span className="text-[12px] text-fg-3">
                            {log.tool_calls.length} {log.tool_calls.length === 1 ? "actie" : "acties"}
                          </span>
                        ) : null}
                        <span className="text-[13px] text-fg-3">{fmtDateTime(log.created_at)}</span>
                      </div>
                    </div>
                    <p className="m-0 text-sm text-fg-1">{log.input_text}</p>
                    {log.reply_text ? (
                      <p className="m-0 text-[13px] text-fg-3 whitespace-pre-wrap">{log.reply_text}</p>
                    ) : null}
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
