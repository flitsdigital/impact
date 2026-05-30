import { createClient } from '@/lib/supabase/server'
import { ProjectenModule } from '@/components/projecten/ProjectenModule'
import type { Project, Milestone, ProjectAssigneeProfile } from '@/types/project'

export default async function ProjectenPage() {
  const supabase = await createClient()

  // Assignees per project (table may not exist yet)
  type AssigneeRow = {
    project_id: string
    profile_id: string
    profiles:   ProjectAssigneeProfile['profiles']
  }

  // These reads are independent — fire them in parallel to avoid a waterfall.
  const [
    { data: rawProjects },
    { data: taskSummary },
    { data: rawMilestones },
    assigneeResult,
  ] = await Promise.all([
    supabase
      .from('projects')
      .select(`
        id, klant_id, naam, beschrijving, status, kleur, prioriteit,
        budget, start_date, deadline, project_number,
        created_at, updated_at,
        klanten ( id, naam )
      `)
      .not('status', 'eq', 'gearchiveerd')
      .order('naam'),
    supabase.from('tasks').select('project_id, status'),
    supabase.from('milestones').select('id, project_id, naam, datum, voltooid, created_at'),
    supabase
      .from('project_assignees')
      .select('project_id, profile_id, profiles ( id, full_name, avatar_url, email )')
      .then((r) => r, () => ({ data: [] })), // table may not exist yet
  ])

  const assigneeRows = (assigneeResult.data ?? []) as unknown as AssigneeRow[]

  const assigneesByProject = new Map<string, ProjectAssigneeProfile[]>()
  for (const row of assigneeRows) {
    const list = assigneesByProject.get(row.project_id) ?? []
    list.push({ profile_id: row.profile_id, profiles: row.profiles })
    assigneesByProject.set(row.project_id, list)
  }

  const rawProjectRows = (rawProjects ?? []) as unknown as Array<
    Project & { klanten?: { id: string; naam: string } | null }
  >
  const projects: Array<
    Project & {
      klanten?: { id: string; naam: string } | null
      assignees: ProjectAssigneeProfile[]
    }
  > = rawProjectRows.map((p) => ({
    ...p,
    assignees: assigneesByProject.get(p.id) ?? [],
  }))

  const milestones = (rawMilestones ?? []) as unknown as Milestone[]

  return (
    <ProjectenModule
      projects={projects}
      tasks={taskSummary ?? []}
      milestones={milestones}
    />
  )
}
