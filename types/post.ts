import type { TeamMember } from './team'

export type PostStatus = 'te_doen' | 'bezig' | 'klaar_voor_feedback' | 'akkoord' | 'gepost'
export type PostType = 'foto' | 'video' | 'reel' | 'carousel'

// ─── Status presentatie (gedeeld over ContentModule, NieuwePostDrawer, preview) ─

export const STATUS_ORDER: PostStatus[] = [
  'te_doen', 'bezig', 'klaar_voor_feedback', 'akkoord', 'gepost',
]

export const STATUS_LABEL: Record<PostStatus, string> = {
  te_doen:             'Te doen',
  bezig:               'Bezig',
  klaar_voor_feedback: 'Klaar voor feedback',
  akkoord:             'Akkoord',
  gepost:              'Gepost',
}

export const STATUS_ICON: Record<PostStatus, string> = {
  te_doen:             'circle-dashed',
  bezig:               'circle-notch',
  klaar_voor_feedback: 'circle',
  akkoord:             'scrubber',
  gepost:              'circle-check',
}

// Hex-kleuren voor contexten zonder Tailwind-tokens (publieke preview-pagina)
export const STATUS_COLOR: Record<PostStatus, string> = {
  te_doen:             '#6b7280',
  bezig:               '#f97316',
  klaar_voor_feedback: '#3b82f6',
  akkoord:             '#a855f7',
  gepost:              '#22c55e',
}

export interface Post {
  id: string
  klant_id: string | null
  klant_naam?: string | null   // joined from klanten
  status: PostStatus
  type: PostType
  caption: string | null
  media_url: string | null
  scheduled_at: string | null  // ISO date "YYYY-MM-DD"
  published_at: string | null
  assignee_id: string | null   // legacy single-assignee column, kept for DB compat
  assignees?: TeamMember[]     // from post_assignees join (supports multiple)
  created_at: string
  updated_at: string
}

export interface PostLog {
  id: string
  post_id: string
  user_id: string | null
  action: string
  from_status: PostStatus | null
  to_status: PostStatus | null
  note: string | null
  created_at: string
}
