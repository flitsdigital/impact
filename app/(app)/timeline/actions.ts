'use server'

import { revalidatePath } from 'next/cache'
import { createClient, requireAuth } from '@/lib/supabase/server'
import type { InvoiceRecord, FactuurStatus } from '@/types/factuur'
import { FACTUUR_STATUS_NEXT } from '@/types/factuur'

// ─── Toggle invoiced status for a recurring invoice date ──────────────────────

export async function toggleInvoiceRecord(
  klantId:  string,
  dateStr:  string,
  invoiced: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const { data: klant, error: fetchError } = await supabase
    .from('klanten')
    .select('invoice_records')
    .eq('id', klantId)
    .single()

  if (fetchError) return { error: fetchError.message }

  const records: InvoiceRecord[] = klant?.invoice_records ?? []
  const existing = records.find((r) => r.date === dateStr)

  let updated: InvoiceRecord[]
  if (existing) {
    updated = records.map((r) =>
      r.date === dateStr
        ? { ...r, invoiced, invoiced_at: invoiced ? new Date().toISOString() : null }
        : r,
    )
  } else {
    updated = [
      ...records,
      { date: dateStr, invoiced, invoiced_at: invoiced ? new Date().toISOString() : null },
    ]
  }

  const { error } = await supabase
    .from('klanten')
    .update({ invoice_records: updated })
    .eq('id', klantId)

  if (error) return { error: error.message }

  revalidatePath('/timeline')
  return {}
}

// ─── Advance factuur status (planned → sent → paid) ───────────────────────────

export async function cycleFactuurStatus(
  factuurId:     string,
  currentStatus: FactuurStatus,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  const newStatus = FACTUUR_STATUS_NEXT[currentStatus]

  const update: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'sent') update.sent_at = new Date().toISOString()
  if (newStatus === 'paid') update.paid_at = new Date().toISOString()

  const { error } = await supabase
    .from('klant_facturen')
    .update(update)
    .eq('id', factuurId)

  if (error) return { error: error.message }

  revalidatePath('/timeline')
  return {}
}
