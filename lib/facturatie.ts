import type { KlantBilling, ComputedInvoice } from '@/types/factuur'
import { toLocalDateStr } from '@/lib/dates'

// Pure factuur-berekeningen, gedeeld door de Facturatie-tijdlijn (client) en het
// Dashboard (server). Eén bron van waarheid voor recurring-cyclus + milestones.

export function addMonths(d: Date, n: number): Date {
  const out = new Date(d)
  out.setMonth(out.getMonth() + n)
  return out
}

/** Alle facturatie-datums van een recurring-contract t/m `until` (of contract-eind). */
export function calcRecurringDates(klant: KlantBilling, until: Date): string[] {
  const startStr = klant.contract_start_date
  if (!startStr || !klant.billing_cycle) return []

  const start = new Date(startStr + 'T00:00:00')
  const endD = klant.contract_end_date
    ? new Date(klant.contract_end_date + 'T00:00:00')
    : until

  const dates: string[] = []
  const cur = new Date(start)

  while (cur <= until && cur <= endD) {
    dates.push(toLocalDateStr(cur))
    switch (klant.billing_cycle) {
      case '4_weeks': cur.setDate(cur.getDate() + 28); break
      case '6_weeks': cur.setDate(cur.getDate() + 42); break
      case 'monthly': { const m = addMonths(cur, 1); cur.setTime(m.getTime()); break }
      case 'custom':  cur.setDate(cur.getDate() + (klant.custom_cycle_days ?? 30)); break
    }
  }
  return dates
}

/** Berekende factuurmomenten voor één klant — recurring-cyclus of project/one-off milestones. */
export function getComputedInvoices(klant: KlantBilling, until: Date): ComputedInvoice[] {
  if (klant.type === 'recurring') {
    const dates = calcRecurringDates(klant, until)
    return dates.map((dateStr) => {
      const rec = klant.invoice_records.find((r) => r.date === dateStr)
      return {
        date: new Date(dateStr + 'T00:00:00'),
        dateStr,
        invoiced: rec?.invoiced ?? false,
        invoicedAt: rec?.invoiced_at ?? null,
        amount: klant.price_per_cycle ?? 0,
      }
    })
  }

  // project / one-off: gebruik klant_facturen milestones
  return (klant.klant_facturen ?? []).map((f) => ({
    date: new Date(f.due_date + 'T00:00:00'),
    dateStr: f.due_date,
    invoiced: f.status === 'paid',
    invoicedAt: f.paid_at,
    amount: f.amount,
    factuurId: f.id,
    factuurStatus: f.status,
    label: f.label,
  }))
}
