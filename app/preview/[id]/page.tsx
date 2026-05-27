import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { PostStatus, PostType } from '@/types/post'
import type { TeamMember } from '@/types/team'

// ─── Status / type labels ─────────────────────────────────────────────────────

const STATUS_LABEL: Record<PostStatus, string> = {
  te_doen:             'Te doen',
  bezig:               'Bezig',
  klaar_voor_feedback: 'Klaar voor feedback',
  akkoord:             'Akkoord',
  gepost:              'Gepost',
}

const STATUS_COLOR: Record<PostStatus, string> = {
  te_doen:             '#6b7280',
  bezig:               '#f97316',
  klaar_voor_feedback: '#3b82f6',
  akkoord:             '#a855f7',
  gepost:              '#22c55e',
}

const TYPE_LABEL: Record<PostType, string> = {
  foto:     'Foto',
  video:    'Video',
  reel:     'Reel',
  carousel: 'Carousel',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch post
  const { data: post } = await supabase
    .from('posts')
    .select('*, klanten(naam)')
    .eq('id', id)
    .single()

  if (!post) notFound()

  // Fetch assignees
  const { data: assigneeRows } = await supabase
    .from('post_assignees')
    .select('profiles(id, full_name, avatar_url, email)')
    .eq('post_id', id)

  const assignees: TeamMember[] = (assigneeRows ?? [])
    .flatMap((r: any) => (r.profiles ? [r.profiles as TeamMember] : []))

  const klantNaam: string | null = (post as any).klanten?.naam ?? null
  const scheduledDate = post.scheduled_at
    ? new Date(post.scheduled_at + 'T00:00:00').toLocaleDateString('nl-NL', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  const status     = post.status as PostStatus
  const type       = post.type as PostType

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0A0A0B',
        color: '#E8E8E8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 0 48px',
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          borderBottom: '1px solid #1D1E1F',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#0F0F10',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: '#E8E8E8', letterSpacing: '-0.01em' }}>
          Flits Digital
        </span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>Content preview</span>
      </div>

      {/* ── Card ────────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          margin: '32px 16px 0',
          background: '#0F0F10',
          border: '1px solid #1D1E1F',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        {/* Media */}
        {post.media_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.media_url}
            alt="Post media"
            style={{ width: '100%', display: 'block', maxHeight: 420, objectFit: 'cover' }}
          />
        )}

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {/* Status + Type row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                height: 24,
                padding: '0 10px',
                borderRadius: 999,
                border: `1px solid ${STATUS_COLOR[status]}40`,
                background: `${STATUS_COLOR[status]}18`,
                fontSize: 11,
                fontWeight: 500,
                color: STATUS_COLOR[status],
              }}
            >
              {STATUS_LABEL[status]}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 24,
                padding: '0 10px',
                borderRadius: 999,
                border: '1px solid #2a2a2b',
                background: '#1a1a1b',
                fontSize: 11,
                fontWeight: 500,
                color: '#9ca3af',
              }}
            >
              {TYPE_LABEL[type]}
            </span>
            {klantNaam && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 24,
                  padding: '0 10px',
                  borderRadius: 999,
                  border: '1px solid #2a2a2b',
                  background: '#1a1a1b',
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#9ca3af',
                }}
              >
                {klantNaam}
              </span>
            )}
          </div>

          {/* Caption */}
          {post.caption ? (
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                color: '#d1d5db',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: '0 0 16px',
              }}
            >
              {post.caption}
            </p>
          ) : (
            <p style={{ fontSize: 13, color: '#6b7280', fontStyle: 'italic', margin: '0 0 16px' }}>
              Geen caption toegevoegd.
            </p>
          )}

          {/* Date + Assignees */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 14,
              borderTop: '1px solid #1D1E1F',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {scheduledDate ? (
              <span style={{ fontSize: 12, color: '#6b7280' }}>{scheduledDate}</span>
            ) : (
              <span style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Geen datum gepland</span>
            )}

            {/* Assignee avatars */}
            {assignees.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {assignees.slice(0, 4).map((a, i) => (
                  <div
                    key={a.id}
                    title={a.full_name ?? a.email ?? undefined}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: '#2a2a2b',
                      border: '2px solid #0F0F10',
                      marginLeft: i > 0 ? -8 : 0,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#9ca3af',
                      zIndex: assignees.length - i,
                      position: 'relative',
                    }}
                  >
                    {a.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.avatar_url}
                        alt={a.full_name ?? ''}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      (a.full_name ?? a.email ?? '?').charAt(0).toUpperCase()
                    )}
                  </div>
                ))}
                {assignees.length > 4 && (
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: '#2a2a2b',
                      border: '2px solid #0F0F10',
                      marginLeft: -8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: '#9ca3af',
                      position: 'relative',
                      zIndex: 0,
                    }}
                  >
                    +{assignees.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <p style={{ marginTop: 32, fontSize: 12, color: '#4b5563' }}>
        Gedeeld via Flits Digital CRM
      </p>
    </div>
  )
}
