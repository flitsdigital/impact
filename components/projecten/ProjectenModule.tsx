// components/projecten/ProjectenModule.tsx
'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Button } from '@/components/ui/Button'
import { PageHeader, PageToolbar } from '@/components/layout/PageHeader'
import { KanbanBoard as SharedKanbanBoard } from '@/components/ui/KanbanBoard'
import { ProjectKaart } from './ProjectKaart'
import { GanttView } from './GanttView'
import { NieuwProjectDrawer } from './NieuwProjectDrawer'
import type { Project, Milestone } from '@/types/project'
import { PROJECT_COLUMNS } from '@/types/project'
import { moveProject, updateProject } from '@/app/(app)/projecten/actions'
import { FilePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

type View = 'kanban' | 'gantt'

const VIEWS: { key: View; iconName: string; label: string }[] = [
  { key: 'kanban', iconName: 'chart-kanban', label: 'Kanban' },
  { key: 'gantt',  iconName: 'chart-gantt',  label: 'Gantt'  },
]

interface ProjectenModuleProps {
  projects:   Array<Project & { klanten?: { id: string; naam: string } | null }>
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
    startTransition(() => { updateProject(projectId, { start_date: start, deadline }) })
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

  const filteredProjects = localProjects.filter(p => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return p.naam.toLowerCase().includes(q) || p.klanten?.naam?.toLowerCase().includes(q)
  })

  const isEmpty = localProjects.length === 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Projecten"
        icon={<SvgIcon name="chart-kanban" size={16} className="text-fg-1 shrink-0" />}
        actions={
          <>
            <div className="flex items-center gap-1.5 bg-bg-3 rounded-full px-3 h-7 w-[220px]">
              <SvgIcon name="magnifying-glass" size={13} className="text-fg-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Zoek een project..."
                aria-label="Zoek een project"
                className="bg-transparent text-[12px] text-fg-1 placeholder:text-fg-3 outline-none flex-1 min-w-0"
              />
            </div>
            <Button
              size="sm"
              onClick={() => { setProjectKey(k => k + 1); setNieuwProjectOpen(true) }}
              className="gap-1.5"
            >
              <FilePlus size={13} />
              Nieuw project
            </Button>
          </>
        }
        toolbar={
          <PageToolbar>
            {VIEWS.map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors',
                  view === v.key ? 'bg-bg-3 text-fg-1' : 'text-fg-3 hover:text-fg-2',
                )}
              >
                <SvgIcon name={v.iconName} size={13} />
                {v.label}
              </button>
            ))}
          </PageToolbar>
        }
      />

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <SvgIcon name="chart-kanban" size={32} className="text-fg-disabled" />
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-medium text-fg-2">Nog geen projecten</span>
              <span className="text-[12px] text-fg-3">Maak je eerste project aan om te beginnen.</span>
            </div>
            <Button
              size="sm"
              onClick={() => { setProjectKey(k => k + 1); setNieuwProjectOpen(true) }}
              className="gap-1.5 mt-2"
            >
              <FilePlus size={13} />
              Nieuw project
            </Button>
          </div>
        ) : view === 'kanban' ? (
          <SharedKanbanBoard
            columns={PROJECT_COLUMNS.map(c => ({ ...c, key: c.status }))}
            items={filteredProjects}
            getItemId={p => p.id}
            getColKey={p => p.status}
            renderCard={(project, isDragging) => (
              <ProjectKaart
                project={project}
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
