import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { KlantDetailModule } from '@/components/klanten/KlantDetailModule'
import type { Klant } from '@/types/klant'
import type { KlantFactuur } from '@/types/factuur'

export interface KlantProject {
  id: string
  naam: string
  status: string
  kleur: string | null
  deadline: string | null
}

export default async function KlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [klantRes, projectsRes, facturenRes] = await Promise.all([
    supabase.from('klanten').select('*').eq('id', id).single(),
    supabase
      .from('projects')
      .select('id, naam, status, kleur, deadline')
      .eq('klant_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('klant_facturen')
      .select('*')
      .eq('klant_id', id)
      .order('due_date', { ascending: true }),
  ])

  if (klantRes.error || !klantRes.data) notFound()

  return (
    <KlantDetailModule
      klant={klantRes.data as Klant}
      projects={(projectsRes.data ?? []) as KlantProject[]}
      facturen={(facturenRes.data ?? []) as KlantFactuur[]}
    />
  )
}
