import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LeadDetailModule } from '@/components/leads/LeadDetailModule'
import type { Lead, LeadContactmoment } from '@/types/lead'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [leadRes, momentenRes] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase
      .from('lead_contactmomenten')
      .select('*')
      .eq('lead_id', id)
      .order('datum', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  if (leadRes.error || !leadRes.data) notFound()

  return (
    <LeadDetailModule
      lead={leadRes.data as Lead}
      contactmomenten={(momentenRes.data ?? []) as LeadContactmoment[]}
    />
  )
}
