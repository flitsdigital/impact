import { createClient } from '@/lib/supabase/server'
import { LeadsModule } from '@/components/leads/LeadsModule'
import type { Lead } from '@/types/lead'

export const metadata = {
  title: 'Leads — Flits CRM',
}

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  return <LeadsModule leads={(leads ?? []) as Lead[]} />
}
