import { createClient } from '@/lib/supabase/server'
import { ProjectenModule } from '@/components/projecten/ProjectenModule'
import type { Project } from '@/types/project'

export default async function ProjectenPage() {
  const supabase = await createClient()

  // Fetch projects (non-archived)
  const { data: rawProjects } = await supabase
    .from('projects')
    .select(`
      id, klant_id, naam, beschrijving, status, kleur,
      budget, deadline, project_number,
      created_at, updated_at,
      klanten ( id, naam )
    `)
    .not('status', 'eq', 'gearchiveerd')
    .order('naam')

  // Lightweight task summary for card counts (only need project_id + status)
  const { data: taskSummary } = await supabase
    .from('tasks')
    .select('project_id, status')

  const projects: Array<Project & { klanten?: { id: string; naam: string } | null }> =
    (rawProjects ?? []).map((p: any) => ({ ...p }))

  return (
    <ProjectenModule
      projects={projects}
      tasks={taskSummary ?? []}
    />
  )
}
