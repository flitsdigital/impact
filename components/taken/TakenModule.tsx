'use client'

import { useState, useMemo, useTransition } from 'react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SearchInput } from '@/components/ui/SearchInput'
import { useIsMobile } from '@/hooks/useIsMobile'
import { PageHeader, PageToolbar } from '@/components/layout/PageHeader'
import { KanbanBoard } from '@/components/projecten/KanbanBoard'
import { TakenLijst } from './TakenLijst'
import { TaakDetailDrawer } from '@/components/projecten/TaakDetailDrawer'
import { NieuweTaakDrawer } from '@/components/projecten/NieuweTaakDrawer'
import type { Project, Task, TaskWithRelations, TaskStatus, TaskPriority } from '@/types/project'
import { PRIORITY_CONFIG } from '@/types/project'
import { moveTask } from '@/app/(app)/projecten/actions'
type View = 'kanban' | 'lijst'

interface TakenModuleProps {
  projects:    Array<Project & { klanten?: { id: string; naam: string } | null }>
  tasks:       TaskWithRelations[]
}

const VIEW_TABS: { value: View; label: string; icon: string }[] = [
  { value: 'lijst',  label: 'Lijst',  icon: 'list-check' },
  { value: 'kanban', label: 'Kanban', icon: 'chart-kanban' },
]

export function TakenModule({ projects, tasks: initialTasks }: TakenModuleProps) {
  // Telefoon landt op de lijst (= kaarten); kanban blijft de desktop-default.
  const isMobile = useIsMobile()
  const [userView, setUserView]                 = useState<View | null>(null)
  const view = userView ?? (isMobile ? 'lijst' : 'kanban')
  const [searchQuery, setSearchQuery]           = useState('')
  const [filterProject, setFilterProject]       = useState<string>('all')
  const [filterPriority, setFilterPriority]     = useState<string>('all')
  const [filtersOpen, setFiltersOpen]           = useState(false)
  const [selectedTask, setSelectedTask]         = useState<TaskWithRelations | null>(null)
  const [detailOpen, setDetailOpen]             = useState(false)
  const [nieuweTaakOpen, setNieuweTaakOpen]     = useState(false)
  const [defaultTaskStatus, setDefaultTaskStatus] = useState<TaskStatus>('todo')
  const [taakKey, setTaakKey]                   = useState(0)
  const [, startTransition]                     = useTransition()

  const [localTasks, setLocalTasks] = useState<TaskWithRelations[]>(initialTasks)

  function handleMove(taskId: string, toStatus: TaskStatus) {
    const task = localTasks.find((t) => t.id === taskId)
    if (!task || task.status === toStatus) return
    setLocalTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: toStatus } : t))
    startTransition(() => { moveTask(taskId, toStatus) })
  }

  function handleTaskCreated(task: Task) {
    const proj = projects.find((p) => p.id === task.project_id)
    const newTask: TaskWithRelations = {
      ...task,
      project:       proj ? { id: proj.id, naam: proj.naam, kleur: proj.kleur } : undefined,
      assignees:     [],
      labels:        [],
      subtasks:      [],
      subtask_done:  0,
      subtask_total: 0,
    }
    setLocalTasks((prev) => [...prev, newTask])
  }

  const filteredTasks = useMemo(() => {
    let result = localTasks
    if (filterProject !== 'all') result = result.filter((t) => t.project_id === filterProject)
    if (filterPriority !== 'all') result = result.filter((t) => t.prioriteit === filterPriority)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.titel.toLowerCase().includes(q) ||
          t.project?.naam?.toLowerCase().includes(q) ||
          `flt-${t.task_number}`.includes(q),
      )
    }
    return result
  }, [localTasks, filterProject, filterPriority, searchQuery])

  const activeFilterCount = [
    filterProject !== 'all',
    filterPriority !== 'all',
    searchQuery.trim() !== '',
  ].filter(Boolean).length

  function openTaskDetail(task: TaskWithRelations) {
    setSelectedTask(task)
    setDetailOpen(true)
  }

  function openAddTask(status: TaskStatus) {
    setDefaultTaskStatus(status)
    setTaakKey((k) => k + 1)
    setNieuweTaakOpen(true)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Taken"
        icon={<SvgIcon name="list-check" size={16} className="text-fg-1 shrink-0" />}
        actions={
          <>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Zoek taak of project..."
              ariaLabel="Zoek taak of project"
            />

            <Button
              size="sm"
              onClick={() => { setTaakKey((k) => k + 1); setNieuweTaakOpen(true) }}
              className="gap-1.5"
            >
              <SvgIcon name="plus" size={13} />
              Nieuwe taak
            </Button>
          </>
        }
        toolbar={
          <>
            <PageToolbar>
              <SegmentedControl options={VIEW_TABS} value={view} onChange={setUserView} />

              {/* Filters button */}
              <Button
                variant={filtersOpen || activeFilterCount > 0 ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => setFiltersOpen((v) => !v)}
                className="gap-1.5"
              >
                <SvgIcon name="filter" size={12} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-medium">
                    {activeFilterCount}
                  </span>
                )}
              </Button>

              <span className="ml-auto text-[12px] text-muted-foreground">
                {filteredTasks.length} taken
              </span>
            </PageToolbar>

            {/* Filter panel */}
            {filtersOpen && (
              <div className="flex items-center gap-3 pl-8 pr-3 py-2 border-t border-border shrink-0">
                <Select value={filterProject} onValueChange={(v) => setFilterProject(v ?? 'all')}>
                  <SelectTrigger size="sm" className="text-[12px]" aria-label="Filter op project">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">Alle projecten</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v ?? 'all')}>
                  <SelectTrigger size="sm" className="text-[12px]" aria-label="Filter op prioriteit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">Alle prioriteiten</SelectItem>
                      {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                        <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => { setFilterProject('all'); setFilterPriority('all'); setSearchQuery('') }}
                  >
                    Wis filters
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => { setTaakKey((k) => k + 1); setNieuweTaakOpen(true) }}
                  className="ml-auto gap-1.5"
                >
                  <SvgIcon name="plus" size={12} />
                  Nieuwe taak
                </Button>
              </div>
            )}
          </>
        }
      />

      {/* Content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {view === 'kanban' && (
          <KanbanBoard
            tasks={filteredTasks}
            onTaskClick={openTaskDetail}
            onAddTask={openAddTask}
            onMove={handleMove}
            showProject
          />
        )}

        {view === 'lijst' && (
          <TakenLijst tasks={filteredTasks} onTaskClick={openTaskDetail} showProject />
        )}
      </div>

      {/* Drawers */}
      <TaakDetailDrawer
        task={selectedTask}
        open={detailOpen}
        onOpenChange={(v) => { setDetailOpen(v); if (!v) setSelectedTask(null) }}
        onDelete={() => setDetailOpen(false)}
      />

      <NieuweTaakDrawer
        key={taakKey}
        open={nieuweTaakOpen}
        onOpenChange={setNieuweTaakOpen}
        projects={projects}
        defaultStatus={defaultTaskStatus}
        defaultProjectId={filterProject !== 'all' ? filterProject : undefined}
        onCreated={handleTaskCreated}
      />
    </div>
  )
}

