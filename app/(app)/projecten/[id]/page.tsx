import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProjectDetailModule } from '@/components/projecten/ProjectDetailModule'
import type {
  ProjectWithRelations,
  Task,
  TaskWithRelations,
} from '@/types/project'
import type { TeamMember } from '@/types/team'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // ── Fetch project with core relations ─────────────────────────────────────
  const { data: rawProject, error } = await supabase
    .from('projects')
    .select(`
      id, klant_id, naam, beschrijving, status, kleur, prioriteit,
      budget, start_date, deadline, project_number,
      created_at, updated_at,
      klanten ( id, naam ),
      project_labels ( id, project_id, naam, kleur, created_at )
    `)
    .eq('id', id)
    .single()

  if (error || !rawProject) notFound()

  const { data: assigneeData } = await supabase
    .from('project_assignees')
    .select('profile_id, profiles ( id, full_name, avatar_url, email )')
    .eq('project_id', id)
  const assignees: any[] = assigneeData ?? []

  const { data: { user } } = await supabase.auth.getUser()
  let favorites: { user_id: string }[] = []
  if (user) {
    const { data } = await supabase
      .from('project_favorites')
      .select('user_id')
      .eq('project_id', id)
      .eq('user_id', user.id)
    favorites = data ?? []
  }

  const { data: documentData } = await supabase
    .from('project_documents')
    .select('id, project_id, type, naam, url, created_at')
    .eq('project_id', id)
    .order('created_at', { ascending: true })
  let documents: any[] = documentData ?? []

  // Sign file URLs (bucket is private). Links pass through untouched.
  if (documents.length > 0) {
    documents = await Promise.all(
      documents.map(async (doc) => {
        if (doc.type !== 'file') return doc
        const path = doc.url.includes('/project-docs/')
          ? doc.url.split('/project-docs/')[1]   // legacy full-URL rows
          : doc.url                               // new path-only rows
        const { data } = await supabase.storage
          .from('project-docs')
          .createSignedUrl(path, 60 * 60)         // 1 hour
        return { ...doc, url: data?.signedUrl ?? doc.url }
      })
    )
  }

  const project: ProjectWithRelations = {
    ...(rawProject as any),
    prioriteit: rawProject.prioriteit ?? 'normaal',
    assignees,
    labels: rawProject.project_labels ?? [],
    favorites,
    documents,
  }

  // ── Fetch tasks for this project ──────────────────────────────────────────
  const { data: rawTasks } = await supabase
    .from('tasks')
    .select(`
      id, project_id, sprint_id, milestone_id, parent_id, task_number,
      titel, beschrijving, status, prioriteit, deadline,
      schatting_uren, gelogde_uren, volgorde,
      created_at, updated_at,
      task_assignees (
        profile_id,
        profiles ( id, full_name, avatar_url, email )
      ),
      task_labels (
        label_id,
        project_labels ( id, project_id, naam, kleur )
      )
    `)
    .eq('project_id', id)
    .order('volgorde', { ascending: true })
    .order('created_at', { ascending: false })

  // Build subtask map
  const allTasks: Task[] = (rawTasks ?? []).map((t: any) => ({
    ...t,
    assignees: [],
    labels: [],
    subtasks: [],
  }))

  const subtaskMap = new Map<string, Task[]>()
  for (const t of allTasks) {
    if (t.parent_id) {
      const arr = subtaskMap.get(t.parent_id) ?? []
      arr.push(t)
      subtaskMap.set(t.parent_id, arr)
    }
  }

  const tasks: TaskWithRelations[] = (rawTasks ?? [])
    .filter((t: any) => !t.parent_id)
    .map((t: any) => {
      const subtasks = subtaskMap.get(t.id) ?? []
      return {
        ...t,
        project: { id: project.id, naam: project.naam, kleur: project.kleur },
        assignees: t.task_assignees ?? [],
        labels: t.task_labels ?? [],
        subtasks,
        subtask_done: subtasks.filter((s) => s.status === 'klaar').length,
        subtask_total: subtasks.length,
      } satisfies TaskWithRelations
    })

  // ── Fetch team members ────────────────────────────────────────────────────
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, email')
    .order('full_name')

  return (
    <ProjectDetailModule
      project={project}
      tasks={tasks}
      teamMembers={(teamMembers ?? []) as TeamMember[]}
    />
  )
}
