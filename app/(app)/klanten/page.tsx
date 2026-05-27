import { createClient } from '@/lib/supabase/server'
import { KlantenTable } from '@/components/klanten/KlantenTable'
import type { Klant } from '@/types/klant'
import { PageHeader } from '@/components/layout/PageHeader'

export default async function KlantenPage() {
  const supabase = await createClient()
  const { data: klanten } = await supabase
    .from('klanten')
    .select('*')
    .order('created_at', { ascending: false })

  return <div>
    <KlantenTable klanten={(klanten as Klant[]) ?? []} />
  </div>
}
