import { createClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/permissions.server'
import { LeadsModule } from '@/components/leads/LeadsModule'
import type { Lead } from '@/types/lead'
import type { TeamMember } from '@/types/team'

export const metadata = {
  title: 'Leads — Flits CRM',
}

export default async function LeadsPage() {
  await requireFeature('leads')
  const supabase = await createClient()

  const [{ data: leads }, { data: team }, { data: assigneeRows }] = await Promise.all([
    supabase.from('leads').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, avatar_url, email').order('full_name'),
    supabase.from('lead_assignees').select('lead_id, profiles(id, full_name, avatar_url, email)'),
  ])

  type AssigneeRow = { lead_id: string; profiles: TeamMember | null }
  const assigneesMap = new Map<string, TeamMember[]>()
  for (const row of (assigneeRows ?? []) as unknown as AssigneeRow[]) {
    if (!row.profiles) continue
    if (!assigneesMap.has(row.lead_id)) assigneesMap.set(row.lead_id, [])
    assigneesMap.get(row.lead_id)!.push(row.profiles)
  }

  const withAssignees = (leads ?? []).map((l) => ({
    ...l,
    assignees: assigneesMap.get(l.id) ?? [],
  })) as Lead[]

  return <LeadsModule leads={withAssignees} team={(team ?? []) as TeamMember[]} />
}
