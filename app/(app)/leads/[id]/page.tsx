import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LeadDetailModule } from '@/components/leads/LeadDetailModule'
import type { Lead, LeadContactmoment, LeadDocument } from '@/types/lead'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [leadRes, momentenRes, documentenRes] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase
      .from('lead_contactmomenten')
      .select('*')
      .eq('lead_id', id)
      .order('datum', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('lead_documents')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (leadRes.error || !leadRes.data) notFound()

  // Sign file-URLs (bucket is privé). Links gaan ongewijzigd door.
  let documents = (documentenRes.data ?? []) as LeadDocument[]
  if (documents.length > 0) {
    documents = await Promise.all(
      documents.map(async (doc) => {
        if (doc.type !== 'file') return doc
        const { data } = await supabase.storage
          .from('lead-docs')
          .createSignedUrl(doc.url, 60 * 60)   // 1 uur
        return { ...doc, url: data?.signedUrl ?? doc.url }
      })
    )
  }

  return (
    <LeadDetailModule
      lead={leadRes.data as Lead}
      contactmomenten={(momentenRes.data ?? []) as LeadContactmoment[]}
      documents={documents}
    />
  )
}
