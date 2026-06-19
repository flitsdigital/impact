import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { createAdminClient } from "@/lib/supabase/admin"
import { fmtDateTime } from "@/lib/dates"
import { describeCall, type ToolCall } from "@/lib/assistant/describe"

// Service-role leest assistant_log (RLS = default-deny). Server component →
// admin-import is veilig; middleware borgt dat alleen ingelogde teamleden hier komen.
export const dynamic = "force-dynamic"

type LogRow = {
  id: string
  input_text: string
  reply_text: string | null
  tool_calls: ToolCall[] | null
  created_at: string
  profiles: { full_name: string | null } | null
}

export default async function LogboekPage() {
  const admin = createAdminClient()
  const { data } = await admin
    .from("assistant_log")
    .select("id, input_text, reply_text, tool_calls, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(200)

  const logs = (data ?? []) as unknown as LogRow[]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Logboek" iconName="list" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[1000px] mx-auto w-full flex flex-col gap-3">
          <p className="text-[13px] text-fg-3">
            Laatste 200 interacties met de AI-assistent: wat je vroeg, wat de assistent
            aanmaakte en waar, en wat hij terugstuurde.
          </p>

          {logs.length === 0 ? (
            <Card className="bg-bg-0 p-4">
              <p className="m-0 text-[13px] text-fg-3">Nog geen interacties.</p>
            </Card>
          ) : (
            <Card className="bg-bg-0 gap-0 p-0 overflow-hidden">
              {logs.map((log, i) => {
                const calls = (log.tool_calls ?? []).map(describeCall)
                return (
                  <div
                    key={log.id}
                    className={`flex flex-col gap-2 px-4 py-3 ${i > 0 ? "border-t border-border-subtle" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-fg-2 truncate">
                        {log.profiles?.full_name ?? "Onbekend"}
                      </span>
                      <span className="text-[13px] text-fg-3 shrink-0">{fmtDateTime(log.created_at)}</span>
                    </div>

                    {/* Wat de gebruiker zei */}
                    <p className="m-0 text-sm text-fg-1">{log.input_text}</p>

                    {/* Wat de assistent terugstuurde */}
                    {log.reply_text ? (
                      <p className="m-0 text-[13px] text-fg-3 whitespace-pre-wrap">{log.reply_text}</p>
                    ) : null}

                    {/* Wat er is aangemaakt/gewijzigd, en waar */}
                    {calls.length > 0 ? (
                      <div className="flex flex-col gap-1 pt-1">
                        {calls.map((c, j) => (
                          <div key={j} className="flex items-center gap-2 text-[13px]">
                            <span className="text-fg-2">{c.action}</span>
                            {c.detail ? <span className="text-fg-1 font-medium truncate">{c.detail}</span> : null}
                            {c.module ? (
                              c.href ? (
                                <Link href={c.href} className="ml-auto shrink-0">
                                  <Badge variant="outline">{c.module}</Badge>
                                </Link>
                              ) : (
                                <Badge variant="outline" className="ml-auto shrink-0">{c.module}</Badge>
                              )
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
