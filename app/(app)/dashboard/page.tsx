import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardTitle, CardDescription } from "@/components/ui/Card"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const firstName = user?.user_metadata?.full_name?.split(" ")[0]
    ?? user?.email?.split("@")[0]
    ?? "daar"

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={`Goedemorgen, ${firstName}`} iconName="grid-2" />

      <div className="p-6 max-w-[1200px] mx-auto w-full">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Actieve klanten", value: "—" },
            { label: "Maandomzet", value: "—" },
            { label: "Verlopen facturen", value: "—" },
            { label: "Posts te doen", value: "—" },
          ].map((tile) => (
            <Card key={tile.label} className="gap-1 bg-bg-0">
              <CardDescription className="text-[13px] font-medium text-fg-2">{tile.label}</CardDescription>
              <CardTitle className="text-2xl font-bold text-fg-1 tracking-tight">{tile.value}</CardTitle>
            </Card>
          ))}
        </div>

        {/* Coming soon */}
        <Card className="bg-bg-0 p-6 text-center">
          <p className="m-0 text-[13px] text-fg-3">
            Dashboard widgets worden gebouwd in Fase 3 — na klantenbeheer.
          </p>
        </Card>
      </div>
    </div>
  )
}
