'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod/v4'
import type { Lead, LeadContactmoment } from '@/types/lead'

const leadSchema = z.object({
  bedrijfsnaam:   z.string().min(1, 'Bedrijfsnaam is verplicht'),
  contactpersoon: z.string().optional().nullable(),
  email:          z.string().optional().nullable(),
  telefoon:       z.string().optional().nullable(),
  bron:           z.enum(['website', 'referral', 'outbound', 'overig']).default('overig'),
  waarde:         z.coerce.number().nonnegative('Waarde kan niet negatief zijn').optional().nullable(),
  notities:       z.string().optional().nullable(),
})

const contactmomentSchema = z.object({
  type:    z.enum(['gebeld', 'gemaild', 'meeting', 'notitie']),
  datum:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ongeldige datum'),
  notitie: z.string().optional().nullable(),
})

async function requireAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd.')
  return user
}

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
  return { success: true, lead: data as Lead }
}

export async function updateLead(
  leadId: string,
  updates: {
    bedrijfsnaam?: string
    contactpersoon?: string | null
    email?: string | null
    telefoon?: string | null
    bron?: string
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

export async function moveLead(leadId: string, newStatus: string): Promise<{ error?: string }> {
  return updateLead(leadId, { status: newStatus })
}

export async function deleteLead(leadId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { error } = await supabase.from('leads').delete().eq('id', leadId)
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

  const file = formData.get('file')
  if (!(file instanceof File)) return { error: 'Geen bestand ontvangen.' }

  const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20 MB — matcht de UI-limiet
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'Bestand is groter dan 20 MB.' }

  // Letters/cijfers/punt/streepje/underscore behouden; de rest wordt '-'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^[-.]+/, '').slice(0, 100)
  const path = `${leadId}/${Date.now()}-${safeName || 'bestand'}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('lead-docs')
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  return { url: path }
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
