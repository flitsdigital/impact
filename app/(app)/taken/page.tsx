import { createClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/permissions.server'
import { TakenModule } from '@/components/taken/TakenModule'
import type { Project, Task, TaskWithRelations } from '@/types/project'

export default async function TakenPage() {
  await requireFeature('taken')
  const supabase = await createClient()

  const { data: rawProjects } = await supabase
    .from('projects')
    .select('id, klant_id, naam, beschrijving, status, kleur, budget, deadline, created_at, updated_at, klanten ( id, naam )')
    .not('status', 'eq', 'gearchiveerd')
    .order('naam')

  const { data: rawTasks } = await supabase
    .from('tasks')
    .select(`
      id, project_id, sprint_id, milestone_id, parent_id, task_number,
      titel, beschrijving, status, prioriteit, deadline,
      schatting_uren, gelogde_uren, volgorde, created_at, updated_at,
      task_assignees ( profile_id, profiles ( id, full_name, avatar_url, email ) ),
      task_labels    ( label_id, project_labels ( id, project_id, naam, kleur ) )
    `)
    .order('volgorde', { ascending: true })
    .order('created_at', { ascending: false })

  const projects: Array<Project & { klanten?: { id: string; naam: string } | null }> =
    (rawProjects ?? []).map((p: any) => ({ ...p }))

  const allTasks: Task[] = (rawTasks ?? []).map((t: any) => ({ ...t }))

  const subtaskMap = new Map<string, Task[]>()
  for (const t of allTasks) {
    if (t.parent_id) {
      const arr = subtaskMap.get(t.parent_id) ?? []
      arr.push(t)
      subtaskMap.set(t.parent_id, arr)
    }
  }

  const projectMap = new Map(projects.map((p) => [p.id, p]))

  const tasks: TaskWithRelations[] = (rawTasks ?? [])
    .filter((t: any) => !t.parent_id)
    .map((t: any) => {
      const subtasks = subtaskMap.get(t.id) ?? []
      return {
        ...t,
        project:       projectMap.get(t.project_id)
          ? { id: t.project_id, naam: (projectMap.get(t.project_id) as any)?.naam, kleur: (projectMap.get(t.project_id) as any)?.kleur }
          : undefined,
        assignees:     t.task_assignees ?? [],
        labels:        t.task_labels    ?? [],
        subtasks,
        subtask_done:  subtasks.filter((s: any) => s.status === 'klaar').length,
        subtask_total: subtasks.length,
      } satisfies TaskWithRelations
    })

  return (
    <TakenModule
      projects={projects}
      tasks={tasks}
    />
  )
}
