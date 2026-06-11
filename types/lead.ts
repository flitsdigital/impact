export type LeadStatus = 'nieuw' | 'contact' | 'offerte' | 'gewonnen' | 'verloren'
export type LeadBron = 'website' | 'referral' | 'outbound' | 'overig'
export type ContactmomentType = 'gebeld' | 'gemaild' | 'meeting' | 'notitie'

export interface Lead {
  id:             string
  bedrijfsnaam:   string
  contactpersoon: string | null
  email:          string | null
  telefoon:       string | null
  bron:           LeadBron
  waarde:         number | null
  notities:       string | null
  status:         LeadStatus
  created_at:     string
  updated_at:     string
}

export interface LeadContactmoment {
  id:         string
  lead_id:    string
  author_id:  string | null
  type:       ContactmomentType
  datum:      string          // 'YYYY-MM-DD'
  notitie:    string | null
  created_at: string
}

export interface LeadWithRelations extends Lead {
  contactmomenten: LeadContactmoment[]
}

// ─── Pipeline-kolommen ────────────────────────────────────────────────────────
// Zelfde vorm als PROJECT_COLUMNS zodat StatusChip, KanbanBoard en de
// status-dropdown er direct mee werken.

export const LEAD_COLUMNS: {
  status:      LeadStatus
  label:       string
  iconName:    string
  textClass:   string
  isCollapsed?: boolean
}[] = [
  { status: 'nieuw',    label: 'Nieuw',    iconName: 'circle-dashed', textClass: 'text-fg-2' },
  { status: 'contact',  label: 'Contact',  iconName: 'circle-notch',  textClass: 'text-orange-500' },
  { status: 'offerte',  label: 'Offerte',  iconName: 'circle',        textClass: 'text-blue-500' },
  { status: 'gewonnen', label: 'Gewonnen', iconName: 'circle-check',  textClass: 'text-green-500', isCollapsed: true },
  { status: 'verloren', label: 'Verloren', iconName: 'x',             textClass: 'text-red-400',   isCollapsed: true },
]

export const BRON_LABEL: Record<LeadBron, string> = {
  website:  'Website',
  referral: 'Referral',
  outbound: 'Outbound',
  overig:   'Overig',
}

export const CONTACT_TYPE_CONFIG: Record<ContactmomentType, { label: string; iconName: string }> = {
  gebeld:  { label: 'Gebeld',  iconName: 'user-clock' },
  gemaild: { label: 'Gemaild', iconName: 'inbox' },
  meeting: { label: 'Meeting', iconName: 'users' },
  notitie: { label: 'Notitie', iconName: 'file-text' },
}
