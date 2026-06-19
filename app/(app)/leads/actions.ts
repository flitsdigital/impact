'use server'

import { revalidatePath } from 'next/cache'
import { createClient, requireAuth, uploadToBucket } from '@/lib/supabase/server'
import { z } from 'zod/v4'
import type { Lead, LeadContactmoment } from '@/types/lead'

const leadSchema = z.object({
  bedrijfsnaam:   z.string().min(1, 'Bedrijfsnaam is verplicht'),
  contactpersoon: z.string().optional().nullable(),
  email:          z.string().optional().nullable(),
  telefoon:       z.string().optional().nullable(),
  bron:           z.enum(['website', 'referral', 'outbound', 'overig']).default('overig'),
  dienst:         z.enum(['social', 'website', 'webshop', 'branding']).optional().nullable(),
  waarde:         z.coerce.number().nonnegative('Waarde kan niet negatief zijn').optional().nullable(),
  notities:       z.string().optional().nullable(),
})

const contactmomentSchema = z.object({
  type:    z.enum(['gebeld', 'gemaild', 'meeting', 'notitie']),
  datum:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ongeldige datum'),
  notitie: z.string().optional().nullable(),
})

function revalidateLeads(leadId?: string) {
  revalidatePath('/leads')
  if (leadId) revalidatePath(`/leads/${leadId}`)
}

// ─── Lead CRUD ────────────────────────────────────────────────────────────────

export async function createLead(
  _prev: { error?: string; success?: boolean; lead?: Lead } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean; lead?: Lead }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const raw = {
    bedrijfsnaam:   formData.get('bedrijfsnaam'),
    contactpersoon: formData.get('contactpersoon') || null,
    email:          formData.get('email') || null,
    telefoon:       formData.get('telefoon') || null,
    bron:           formData.get('bron') || 'overig',
    dienst:         formData.get('dienst') || null,
    waarde:         formData.get('waarde') || null,
    notities:       formData.get('notities') || null,
  }

  const parsed = leadSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Validatiefout' }
  }

  const { data, error } = await supabase
    .from('leads')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidateLeads()
  return { success: true, lead: { ...data, assignees: [] } as Lead }
}

export async function updateLead(
  leadId: string,
  updates: {
    bedrijfsnaam?: string
    contactpersoon?: string | null
    email?: string | null
    telefoon?: string | null
    bron?: string
    dienst?: string | null
    waarde?: number | null
    notities?: string | null
    status?: string
  },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', leadId)

  if (error) return { error: error.message }

  revalidateLeads(leadId)
  return {}
}

// Vervangt de volledige set toegewezen teamleden. Spiegelt todos.setAssignees:
// eerst upsert, daarna verwijderen, zodat een mislukte insert nooit alles wist.
export async function setLeadAssignees(leadId: string, userIds: string[]): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const parsed = z.array(z.string().guid()).safeParse(userIds)
  if (!parsed.success) return { error: 'Ongeldige toewijzing' }
  const ids = parsed.data

  if (ids.length === 0) {
    const { error } = await supabase.from('lead_assignees').delete().eq('lead_id', leadId)
    if (error) return { error: error.message }
    revalidateLeads(leadId)
    return {}
  }

  const { error: insErr } = await supabase
    .from('lead_assignees')
    .upsert(ids.map((user_id) => ({ lead_id: leadId, user_id })), { onConflict: 'lead_id,user_id' })
  if (insErr) return { error: insErr.message }

  const { error: delErr } = await supabase
    .from('lead_assignees')
    .delete()
    .eq('lead_id', leadId)
    .not('user_id', 'in', `(${ids.join(',')})`)
  if (delErr) return { error: delErr.message }

  revalidateLeads(leadId)
  return {}
}

export async function deleteLead(leadId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { error } = await supabase.from('leads').delete().eq('id', leadId)
  if (error) return { error: error.message }

  revalidateLeads()
  return {}
}

const bulkLeadPatchSchema = z.object({
  status: z.enum(['nieuw', 'contact', 'offerte', 'gewonnen', 'verloren']).optional(),
  bron:   z.enum(['website', 'referral', 'outbound', 'overig']).optional(),
})

export async function bulkUpdateLeads(
  ids: string[],
  patch: { status?: string; bron?: string },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  if (ids.length === 0) return { error: 'Geen leads geselecteerd.' }

  const parsed = bulkLeadPatchSchema.safeParse(patch)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Validatiefout' }
  if (Object.keys(parsed.data).length === 0) return { error: 'Niets om bij te werken.' }

  const { error } = await supabase.from('leads').update(parsed.data).in('id', ids)
  if (error) return { error: error.message }

  revalidateLeads()
  return {}
}

export async function bulkDeleteLeads(ids: string[]): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  if (ids.length === 0) return { error: 'Geen leads geselecteerd.' }

  const { error } = await supabase.from('leads').delete().in('id', ids)
  if (error) return { error: error.message }

  revalidateLeads()
  return {}
}

// ─── Documenten / bijlagen ────────────────────────────────────────────────────

export async function addLeadDocument(
  leadId: string,
  type: 'link' | 'file',
  naam: string,
  url: string,
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { data, error } = await supabase
    .from('lead_documents')
    .insert({ lead_id: leadId, type, naam, url })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidateLeads(leadId)
  return { id: data.id }
}

export async function deleteLeadDocument(documentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { data: doc } = await supabase
    .from('lead_documents')
    .select('lead_id, type, url')
    .eq('id', documentId)
    .single()

  if (doc?.type === 'file' && doc.url) {
    // Rijen slaan het kale storage-pad op.
    await supabase.storage.from('lead-docs').remove([doc.url])
  }

  const { error } = await supabase.from('lead_documents').delete().eq('id', documentId)
  if (error) return { error: error.message }

  revalidateLeads(doc?.lead_id)
  return {}
}

export async function uploadLeadFile(
  leadId: string,
  formData: FormData,
): Promise<{ error?: string; url?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  return uploadToBucket(supabase, 'lead-docs', leadId, formData)
}

// ─── Contactmomenten ──────────────────────────────────────────────────────────

export async function addContactmoment(
  leadId: string,
  input: { type: string; datum: string; notitie?: string | null },
): Promise<{ error?: string; contactmoment?: LeadContactmoment }> {
  const supabase = await createClient()
  let user
  try { user = await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const parsed = contactmomentSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Validatiefout' }
  }

  const { data, error } = await supabase
    .from('lead_contactmomenten')
    .insert({ ...parsed.data, lead_id: leadId, author_id: user.id })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidateLeads(leadId)
  return { contactmoment: data as LeadContactmoment }
}

export async function deleteContactmoment(
  contactmomentId: string,
  leadId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { error } = await supabase
    .from('lead_contactmomenten')
    .delete()
    .eq('id', contactmomentId)

  if (error) return { error: error.message }

  revalidateLeads(leadId)
  return {}
}
