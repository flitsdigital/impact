export type KlantType = 'recurring' | 'project' | 'one-off'
export type KlantStatus = 'actief' | 'gepauzeerd' | 'gearchiveerd'

export interface Klant {
  id: string
  naam: string
  type: KlantType
  contactpersoon: string | null
  status: KlantStatus
  volgende_factuur: string | null
  email: string | null
  telefoon: string | null
  website: string | null
  notities: string | null
  created_at: string
  updated_at: string
}
