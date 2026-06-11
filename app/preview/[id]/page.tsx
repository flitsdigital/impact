import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PostStatus, PostType } from '@/types/post'
import { STATUS_LABEL, STATUS_COLOR } from '@/types/post'
import type { TeamMember } from '@/types/team'

// ─── Type labels ──────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<PostType, string> = {
  foto:     'Foto',
  video:    'Video',
  reel:     'Reel',
  carousel: 'Carousel',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

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
    <div className="min-h-[100dvh] bg-[#0A0A0B] text-[#E8E8E8] [font-family:system-ui,-apple-system,sans-serif] flex flex-col items-center pb-12">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="w-full border-b border-[#1D1E1F] px-6 py-[14px] flex items-center justify-between bg-[#0F0F10]">
        <span className="text-[13px] font-semibold text-[#E8E8E8] tracking-[-0.01em]">
          Flits Digital
        </span>
        <span className="text-[12px] text-[#6b7280]">Content preview</span>
      </div>

      {/* ── Card ────────────────────────────────────────────────── */}
      <div className="w-full max-w-[560px] mt-8 mx-4 bg-[#0F0F10] border border-[#1D1E1F] rounded-[14px] overflow-hidden">
        {/* Media */}
        {post.media_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.media_url}
            alt="Post media"
            className="w-full block max-h-[420px] object-cover"
          />
        )}

        {/* Body */}
        <div className="px-6 py-5">
          {/* Status + Type row */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span
              className="inline-flex items-center gap-[5px] h-6 px-2.5 rounded-full text-[11px] font-medium"
              style={{
                border: `1px solid ${STATUS_COLOR[status]}40`,
                background: `${STATUS_COLOR[status]}18`,
                color: STATUS_COLOR[status],
              }}
            >
              {STATUS_LABEL[status]}
            </span>
            <span className="inline-flex items-center h-6 px-2.5 rounded-full border border-[#2a2a2b] bg-[#1a1a1b] text-[11px] font-medium text-[#9ca3af]">
              {TYPE_LABEL[type]}
            </span>
            {klantNaam && (
              <span className="inline-flex items-center h-6 px-2.5 rounded-full border border-[#2a2a2b] bg-[#1a1a1b] text-[11px] font-medium text-[#9ca3af]">
                {klantNaam}
              </span>
            )}
          </div>

          {/* Caption */}
          {post.caption ? (
            <p className="text-[14px] leading-[1.65] text-[#d1d5db] whitespace-pre-wrap break-words mb-4">
              {post.caption}
            </p>
          ) : (
            <p className="text-[13px] text-[#6b7280] italic mb-4">
              Geen caption toegevoegd.
            </p>
          )}

          {/* Date + Assignees */}
          <div className="flex items-center justify-between pt-[14px] border-t border-[#1D1E1F] gap-3 flex-wrap">
            {scheduledDate ? (
              <span className="text-[12px] text-[#6b7280]">{scheduledDate}</span>
            ) : (
              <span className="text-[12px] text-[#6b7280] italic">Geen datum gepland</span>
            )}

            {/* Assignee avatars */}
            {assignees.length > 0 && (
              <div className="flex items-center">
                {assignees.slice(0, 4).map((a, i) => (
                  <div
                    key={a.id}
                    title={a.full_name ?? a.email ?? undefined}
                    className="w-[26px] h-[26px] rounded-full bg-[#2a2a2b] border-2 border-[#0F0F10] overflow-hidden flex items-center justify-center text-[10px] font-semibold text-[#9ca3af] relative"
                    style={{ marginLeft: i > 0 ? -8 : 0, zIndex: assignees.length - i }}
                  >
                    {a.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.avatar_url}
                        alt={a.full_name ?? ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (a.full_name ?? a.email ?? '?').charAt(0).toUpperCase()
                    )}
                  </div>
                ))}
                {assignees.length > 4 && (
                  <div className="w-[26px] h-[26px] rounded-full bg-[#2a2a2b] border-2 border-[#0F0F10] -ml-2 flex items-center justify-center text-[10px] text-[#9ca3af] relative z-0">
                    +{assignees.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <p className="mt-8 text-[12px] text-[#4b5563]">
        Gedeeld via Flits Digital CRM
      </p>
    </div>
  )
}
