import type { Klant } from './klant'

export type BillingCycle = '4_weeks' | '6_weeks' | 'monthly' | 'custom'
export type FactuurStatus = 'planned' | 'sent' | 'paid' | 'overdue'

/** A single entry in klanten.invoice_records (JSONB) */
export interface InvoiceRecord {
  date:        string        // 'YYYY-MM-DD'
  invoiced:    boolean
  invoiced_at: string | null // ISO timestamp
}

/** klant_facturen row — for project / one-off milestones */
export interface KlantFactuur {
  id:             string
  klant_id:       string
  label:          string
  amount:         number
  percentage:     number | null
  due_date:       string      // 'YYYY-MM-DD'
  status:         FactuurStatus
  invoice_number: string | null
  sent_at:        string | null
  paid_at:        string | null
  created_at:     string
  updated_at:     string
}

/** klanten row extended with billing columns (added via migration 005) */
export interface KlantBilling extends Klant {
  contract_start_date: string | null   // contract anchor for cycle calculation
  contract_end_date:   string | null
  billing_cycle:       BillingCycle | null
  custom_cycle_days:   number | null
  price_per_cycle:     number | null
  invoice_records:     InvoiceRecord[]
  project_budget:      number | null
  project_deadline:    string | null
  // Joined from klant_facturen
  klant_facturen:      KlantFactuur[]
}

/** A computed invoice moment (used internally by the timeline) */
export interface ComputedInvoice {
  date:      Date
  dateStr:   string   // 'YYYY-MM-DD'
  invoiced:  boolean
  invoicedAt: string | null
  amount:    number
  // For project/oneoff milestones
  factuurId?:    string
  factuurStatus?: FactuurStatus
  label?:        string
}
