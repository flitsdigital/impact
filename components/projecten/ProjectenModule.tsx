// components/projecten/ProjectenModule.tsx
'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader, PageToolbar } from '@/components/layout/PageHeader'
import { KanbanBoard as SharedKanbanBoard } from '@/components/ui/KanbanBoard'
import { ProjectKaart } from './ProjectKaart'
import { GanttView } from './GanttView'
import { NieuwProjectDrawer } from './NieuwProjectDrawer'
import type { Project, Milestone, ProjectAssigneeProfile } from '@/types/project'
import { PROJECT_COLUMNS } from '@/types/project'
import { moveProject, updateProject } from '@/app/(app)/projecten/actions'

type View = 'kanban' | 'gantt'

const VIEWS: { value: View; icon: string; label: string }[] = [
  { value: 'kanban', icon: 'chart-kanban', label: 'Kanban' },
  { value: 'gantt',  icon: 'chart-gantt',  label: 'Gantt'  },
]

interface ProjectenModuleProps {
  projects:   Array<Project & {
    klanten?:  { id: string; naam: string } | null
    assignees: ProjectAssigneeProfile[]
  }>
  tasks:      Array<{ project_id: string; status: string }>
  milestones: Milestone[]
}

export function ProjectenModule({ projects, tasks: taskSummary, milestones }: ProjectenModuleProps) {
  const router = useRouter()
  const [view, setView]                         = useState<View>('kanban')
  const [searchQuery, setSearchQuery]           = useState('')
  const [nieuwProjectOpen, setNieuwProjectOpen] = useState(false)
  const [projectKey, setProjectKey]             = useState(0)
  const [, startTransition]                     = useTransition()
  const [localProjects, setLocalProjects]       = useState(projects)

  function handleMoveProject(projectId: string, toStatus: string) {
    setLocalProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, status: toStatus as Project['status'] } : p,
    ))
    startTransition(() => { moveProject(projectId, toStatus) })
  }

  function handleDatesChange(projectId: string, start: string | null, deadline: string | null) {
    setLocalProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, start_date: start, deadline } : p,
    ))
    startTransition(async () => {
      const result = await updateProject(projectId, { start_date: start, deadline })
      if (result.error) console.error('[GanttView] updateProject failed:', result.error)
    })
  }

  const taskCountByProject = useMemo(() => {
    const counts: Record<string, { total: number; done: number }> = {}
    for (const t of taskSummary) {
      if (!counts[t.project_id]) counts[t.project_id] = { total: 0, done: 0 }
      counts[t.project_id].total++
      if (t.status === 'klaar') counts[t.project_id].done++
    }
    return counts
  }, [taskSummary])

  const klanten = localProjects
    .filter(p => p.klanten)
    .map(p => ({ id: p.klanten!.id, naam: p.klanten!.naam }))

  const filteredProjects = useMemo(() =>
    localProjects.filter(p => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return p.naam.toLowerCase().includes(q) || p.klanten?.naam?.toLowerCase().includes(q)
    }),
    [localProjects, searchQuery],
  )

  const isEmpty = localProjects.length === 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Projecten"
        icon={<SvgIcon name="chart-kanban" size={16} className="text-fg-1 shrink-0" />}
        actions={
          <>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Zoek een project..."
              ariaLabel="Zoek een project"
            />
            <Button
              size="sm"
              onClick={() => { setProjectKey(k => k + 1); setNieuwProjectOpen(true) }}
              className="gap-1.5"
            >
              <SvgIcon name="file-plus" size={13} />
              Nieuw project
            </Button>
          </>
        }
        toolbar={
          <PageToolbar>
            <SegmentedControl options={VIEWS} value={view} onChange={setView} />
          </PageToolbar>
        }
      />

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {isEmpty ? (
          <EmptyState
            icon={view === 'kanban' ? 'chart-kanban' : 'chart-gantt'}
            title="Nog geen projecten"
            description="Maak je eerste project aan om te beginnen."
            action={
              <Button
                size="sm"
                onClick={() => { setProjectKey(k => k + 1); setNieuwProjectOpen(true) }}
                className="gap-1.5 mt-2"
              >
                <SvgIcon name="file-plus" size={13} />
                Nieuw project
              </Button>
            }
          />
        ) : view === 'kanban' ? (
          <SharedKanbanBoard
            columns={PROJECT_COLUMNS.map(c => ({ ...c, key: c.status }))}
            items={filteredProjects}
            getItemId={p => p.id}
            getColKey={p => p.status}
            renderCard={(project, isDragging) => (
              <ProjectKaart
                project={project}
                assignees={project.assignees}
                taskCounts={taskCountByProject[project.id] ?? { total: 0, done: 0 }}
                isDragging={isDragging}
                onClick={() => router.push(`/projecten/${project.id}`)}
              />
            )}
            onMove={handleMoveProject}
            onAddItem={() => { setProjectKey(k => k + 1); setNieuwProjectOpen(true) }}
            addItemLabel="Nieuw project"
          />
        ) : (
          <GanttView
            projects={filteredProjects}
            milestones={milestones}
            onDatesChange={handleDatesChange}
          />
        )}
      </div>

      <NieuwProjectDrawer
        key={`project-${projectKey}`}
        open={nieuwProjectOpen}
        onOpenChange={setNieuwProjectOpen}
        klanten={klanten}
      />
    </div>
  )
}
