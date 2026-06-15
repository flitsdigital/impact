import JSZip from 'jszip'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { mediaFileName, zipFileName } from '@/lib/download-post-images'

// GET /api/posts/[id]/download → zip met alle afbeeldingen van de post.
// Bestandsnamen: "2026-06-15 01 M. Peters Montage.jpg" (datum, volgorde, klant).
export async function GET(_req: Request, ctx: RouteContext<'/api/posts/[id]/download'>) {
  const { id } = await ctx.params

  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return new Response('Niet ingelogd.', { status: 401 }) }

  const { data: post } = await supabase
    .from('posts')
    .select('media_urls, scheduled_at, created_at, klanten(naam)')
    .eq('id', id)
    .single()

  if (!post) return new Response('Post niet gevonden.', { status: 404 })

  const urls: string[] = post.media_urls ?? []
  if (urls.length === 0) return new Response('Geen afbeeldingen.', { status: 404 })

  const date = post.scheduled_at ?? (post.created_at as string).slice(0, 10)
  const klant = (post as { klanten?: { naam?: string } | null }).klanten?.naam ?? null

  const zip = new JSZip()
  await Promise.all(urls.map(async (url, index) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Kon afbeelding niet ophalen (${res.status})`)
    zip.file(mediaFileName({ date, index, klant, url }), await res.arrayBuffer())
  }))

  const body = await zip.generateAsync({ type: 'arraybuffer' })
  const name = zipFileName(date, klant)
  const asciiName = name.replace(/[^\x20-\x7E]/g, '_')

  return new Response(body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  })
}
