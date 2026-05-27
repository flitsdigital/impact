import { createClient } from '@/lib/supabase/server'
import { FacturatieTijdlijn } from '@/components/facturatie/FacturatieTijdlijn'
import type { KlantBilling } from '@/types/factuur'

export default async function TimelinePage() {
  const supabase = await createClient()

  const { data: klanten } = await supabase
    .from('klanten')
    .select(`
      id, naam, type, status,
      contract_start_date, contract_end_date,
      billing_cycle, custom_cycle_days, price_per_cycle,
      invoice_records, project_budget, project_deadline,
      created_at, updated_at,
      klant_facturen (
        id, klant_id, label, amount, percentage,
        due_date, status, invoice_number, sent_at, paid_at,
        created_at, updated_at
      )
    `)
    .not('status', 'eq', 'gearchiveerd')
    .order('naam')

  const safeKlanten: KlantBilling[] = (klanten ?? []).map((k: any) => ({
    ...k,
    invoice_records: k.invoice_records ?? [],
    klant_facturen:  k.klant_facturen  ?? [],
    // Fields not selected above (keep type compat)
    contactpersoon: k.contactpersoon ?? null,
    volgende_factuur: k.volgende_factuur ?? null,
    email: k.email ?? null,
    telefoon: k.telefoon ?? null,
    website: k.website ?? null,
    notities: k.notities ?? null,
  }))

  return <FacturatieTijdlijn klanten={safeKlanten} />
}
