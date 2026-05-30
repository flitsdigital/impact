import { createClient } from '@/lib/supabase/server'
import { ProjectenModule } from '@/components/projecten/ProjectenModule'
import type { Project, Milestone } from '@/types/project'

export default async function ProjectenPage() {
  const supabase = await createClient()

  const { data: rawProjects } = await supabase
    .from('projects')
    .select(`
      id, klant_id, naam, beschrijving, status, kleur, prioriteit,
      budget, start_date, deadline, project_number,
      created_at, updated_at,
      klanten ( id, naam )
    `)
    .not('status', 'eq', 'gearchiveerd')
    .order('naam')

  const { data: taskSummary } = await supabase
    .from('tasks')
    .select('project_id, status')

  const { data: rawMilestones } = await supabase
    .from('milestones')
    .select('id, project_id, naam, datum, voltooid, created_at')

  const projects: Array<Project & { klanten?: { id: string; naam: string } | null }> =
    (rawProjects ?? []).map((p: any) => ({ ...p }))

  const milestones: Milestone[] = (rawMilestones ?? []).map((m: any) => ({ ...m }))

  return (
    <ProjectenModule
      projects={projects}
      tasks={taskSummary ?? []}
      milestones={milestones}
    />
  )
}
