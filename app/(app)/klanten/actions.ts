'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod/v4'

const klantSchema = z.object({
  naam: z.string().min(1, 'Naam is verplicht'),
  type: z.enum(['recurring', 'project', 'one-off']),
  contactpersoon: z.string().optional(),
  status: z.enum(['actief', 'gepauzeerd', 'gearchiveerd']).default('actief'),
  volgende_factuur: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  telefoon: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  notities: z.string().optional().nullable(),
})

async function requireAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd.')
  return user
}

export async function createKlant(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const raw = {
    naam: formData.get('naam'),
    type: formData.get('type'),
    contactpersoon: formData.get('contactpersoon') || null,
    status: formData.get('status') || 'actief',
    volgende_factuur: formData.get('volgende_factuur') || null,
    email: formData.get('email') || null,
    telefoon: formData.get('telefoon') || null,
    website: formData.get('website') || null,
    notities: formData.get('notities') || null,
  }

  const parsed = klantSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Validatiefout' }
  }

  const { error } = await supabase.from('klanten').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/klanten')
  return { success: true }
}

export async function deleteKlant(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  const { error } = await supabase.from('klanten').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/klanten')
  return {}
}
