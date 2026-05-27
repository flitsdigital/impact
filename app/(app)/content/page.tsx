import { createClient } from '@/lib/supabase/server'
import { ContentModule } from '@/components/content/ContentModule'
import type { Post } from '@/types/post'
import type { Klant } from '@/types/klant'
import type { TeamMember } from '@/types/team'

export default async function ContentPage() {
  const supabase = await createClient()

  const [
    { data: rawPosts },
    { data: klanten },
    { data: teamleden },
    { data: assigneeRows },
  ] = await Promise.all([
    supabase
      .from('posts')
      .select('*, klanten(naam)')
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('klanten')
      .select('id, naam')
      .in('status', ['actief', 'gepauzeerd'])
      .order('naam'),
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .order('full_name'),
    supabase
      .from('post_assignees')
      .select('post_id, profiles(id, full_name, avatar_url, email)'),
  ])

  // Build post_id → TeamMember[] map
  const assigneesMap = new Map<string, TeamMember[]>()
  for (const row of (assigneeRows ?? []) as any[]) {
    if (!row.profiles) continue
    if (!assigneesMap.has(row.post_id)) assigneesMap.set(row.post_id, [])
    assigneesMap.get(row.post_id)!.push(row.profiles as TeamMember)
  }

  const posts: Post[] = (rawPosts ?? []).map((p: any) => ({
    ...p,
    klant_naam:   p.klanten?.naam ?? null,
    klanten:      undefined,
    assignees:    assigneesMap.get(p.id) ?? [],
  }))

  return (
    <ContentModule
      posts={posts}
      klanten={(klanten ?? []) as Pick<Klant, 'id' | 'naam'>[]}
      teamleden={(teamleden ?? []) as TeamMember[]}
    />
  )
}
