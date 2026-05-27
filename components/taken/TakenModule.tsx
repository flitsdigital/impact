'use client'

import { useState, useMemo, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Button } from '@/components/ui/Button'
import { PageHeader, PageToolbar } from '@/components/layout/PageHeader'
import { KanbanBoard } from '@/components/projecten/KanbanBoard'
import { TaakDetailDrawer } from '@/components/projecten/TaakDetailDrawer'
import { NieuweTaakDrawer } from '@/components/projecten/NieuweTaakDrawer'
import type { Project, TaskWithRelations, TaskStatus, TaskPriority } from '@/types/project'
import { PRIORITY_CONFIG, KANBAN_COLUMNS } from '@/types/project'
import type { TeamMember } from '@/types/team'
import { moveTask } from '@/app/(app)/projecten/actions'
import { Plus } from 'lucide-react'

type View = 'kanban' | 'lijst'

interface TakenModuleProps {
  projects:    Array<Project & { klanten?: { id: string; naam: string } | null }>
  tasks:       TaskWithRelations[]
  teamMembers: TeamMember[]
}

const VIEW_TABS: { id: View; label: string; icon: string }[] = [
  { id: 'lijst',  label: 'Lijst',  icon: 'list-check' },
  { id: 'kanban', label: 'Kanban', icon: 'chart-kanban' },
]

export function TakenModule({ projects, tasks: initialTasks, teamMembers: _teamMembers }: TakenModuleProps) {
  const [view, setView]                         = useState<View>('kanban')
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
            {/* Search pill */}
            <div className="flex items-center gap-1.5 bg-bg-3 rounded-full px-3 h-7 w-[220px]">
              <SvgIcon name="magnifying-glass" size={13} className="text-fg-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zoek taak of project..."
                aria-label="Zoek taak of project"
                className="bg-transparent text-[12px] text-fg-1 placeholder:text-fg-3 outline-none flex-1 min-w-0"
              />
            </div>

            <Button
              size="sm"
              onClick={() => { setTaakKey((k) => k + 1); setNieuweTaakOpen(true) }}
              className="gap-1.5"
            >
              <Plus size={13} />
              Nieuwe taak
            </Button>
          </>
        }
        toolbar={
          <>
            <PageToolbar>
              {/* View tabs pill */}
              <div className="flex items-center p-0.5 rounded-full bg-bg-0">
                {VIEW_TABS.map((tab) => (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    size="xs"
                    onClick={() => setView(tab.id)}
                    className={cn('rounded-full gap-1.5', view === tab.id && 'bg-secondary text-foreground')}
                  >
                    <SvgIcon name={tab.icon} size={13} className="shrink-0" />
                    {tab.label}
                  </Button>
                ))}
              </div>

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
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="text-[12px] bg-bg-2 border border-border-subtle rounded px-2.5 py-1 text-fg-2 outline-none"
                  aria-label="Filter op project"
                >
                  <option value="all">Alle projecten</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.naam}</option>
                  ))}
                </select>

                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="text-[12px] bg-bg-2 border border-border-subtle rounded px-2.5 py-1 text-fg-2 outline-none"
                  aria-label="Filter op prioriteit"
                >
                  <option value="all">Alle prioriteiten</option>
                  {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                    <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                  ))}
                </select>

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
                  <Plus size={12} />
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
          <LijstView tasks={filteredTasks} onTaskClick={openTaskDetail} />
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
      />
    </div>
  )
}

// ─── List view ────────────────────────────────────────────────────────────────

function LijstView({
  tasks,
  onTaskClick,
}: {
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
}) {
  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[13px] text-fg-3">
        Geen taken gevonden.
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full px-6 py-4">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-border-subtle">
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-20">ID</th>
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide">Titel</th>
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-36">Project</th>
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-24">Status</th>
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-24">Prioriteit</th>
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-24">Deadline</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const prio   = PRIORITY_CONFIG[task.prioriteit]
            const status = KANBAN_COLUMNS.find((c) => c.status === task.status)
            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="border-b border-border-subtle/50 hover:bg-bg-2 cursor-pointer transition-colors"
              >
                <td className="py-2.5 pr-3 text-[11px] font-mono text-fg-3">FLT-{task.task_number}</td>
                <td className="py-2.5 pr-3 text-[13px] text-fg-1 max-w-[280px] truncate">{task.titel}</td>
                <td className="py-2.5 pr-3">
                  {task.project && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: task.project.kleur }} />
                      <span className="text-[12px] text-fg-2 truncate">{task.project.naam}</span>
                    </div>
                  )}
                </td>
                <td className="py-2.5 pr-3">
                  {status && (
                    <div className="flex items-center gap-1">
                      <SvgIcon name={status.iconName} size={12} className={status.textClass} />
                      <span className={cn('text-[11px]', status.textClass)}>{status.label}</span>
                    </div>
                  )}
                </td>
                <td className="py-2.5 pr-3">
                  {task.prioriteit !== 'normaal' && (
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ color: prio.color, background: prio.bg }}
                    >
                      {prio.label}
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-[12px] text-fg-2">
                  {task.deadline
                    ? new Date(task.deadline + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
                    : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
