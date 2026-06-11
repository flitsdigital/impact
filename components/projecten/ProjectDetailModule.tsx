'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { KanbanBoard } from './KanbanBoard'
import { TaakDetailDrawer } from './TaakDetailDrawer'
import { NieuweTaakDrawer } from './NieuweTaakDrawer'
import { BijlageModal } from './BijlageModal'
import { AssigneesModal } from './AssigneesModal'
import type {
  ProjectWithRelations,
  ProjectDocument,
  ProjectAssigneeProfile,
  Task,
  TaskWithRelations,
  TaskStatus,
  TaskPriority,
  ProjectStatus,
} from '@/types/project'
import { PRIORITY_CONFIG, PRIORITY_ICON, KANBAN_COLUMNS, PROJECT_COLUMNS } from '@/types/project'
import type { TeamMember } from '@/types/team'
import { moveTask, updateProject, toggleFavorite } from '@/app/(app)/projecten/actions'
import { DocumentIcon } from '@/components/projecten/DocumentIcon'

// ─── Constants ───────────────────────────────────────────────────────────────

type Tab = 'overzicht' | 'taken' | 'activiteit'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overzicht', label: 'Overzicht', icon: 'list-check' },
  { id: 'taken', label: 'Taken', icon: 'list-check-1' },
  { id: 'activiteit', label: 'Activiteit', icon: 'chart-gantt' },
]

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ProjectDetailModuleProps {
  project: ProjectWithRelations
  tasks: TaskWithRelations[]
  teamMembers: TeamMember[]
}

export function ProjectDetailModule({
  project: initialProject,
  tasks: initialTasks,
  teamMembers,
}: ProjectDetailModuleProps) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overzicht')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [nieuweTaakOpen, setNieuweTaakOpen] = useState(false)
  const [bijlageOpen, setBijlageOpen] = useState(false)
  const [assigneesOpen, setAssigneesOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [defaultTaskStatus, setDefaultTaskStatus] = useState<TaskStatus>('todo')
  const [taakKey, setTaakKey] = useState(0)
  const [, startTransition] = useTransition()

  const [project, setProject] = useState(initialProject)
  const [localTasks, setLocalTasks] = useState<TaskWithRelations[]>(initialTasks)

  // Inline date editing state
  const [editingDate, setEditingDate] = useState(false)
  const [startDateVal, setStartDateVal] = useState(project.start_date ?? '')
  const [deadlineVal, setDeadlineVal] = useState(project.deadline ?? '')

  // Inline description editing state
  const [editingBeschrijving, setEditingBeschrijving] = useState(false)
  const [beschrijvingVal, setBeschrijvingVal] = useState(project.beschrijving ?? '')

  const isFavorite = project.favorites?.length > 0

  // ── Task actions ────────────────────────────────────────────────────────────

  function handleMoveTask(taskId: string, toStatus: TaskStatus) {
    const task = localTasks.find((t) => t.id === taskId)
    if (!task || task.status === toStatus) return
    setLocalTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: toStatus } : t))
    startTransition(() => { moveTask(taskId, toStatus) })
  }

  // ── Derived data ────────────────────────────────────────────────────────────

  const filteredTasks = useMemo(() => {
    let result = localTasks
    if (filterPriority !== 'all') result = result.filter((t) => t.prioriteit === filterPriority)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) => t.titel.toLowerCase().includes(q) || `flt-${t.task_number}`.includes(q),
      )
    }
    return result
  }, [localTasks, filterPriority, searchQuery])

  const taskCount = localTasks.length

  // ── Handlers ────────────────────────────────────────────────────────────────

  function openTaskDetail(task: TaskWithRelations) {
    setSelectedTask(task)
    setDetailOpen(true)
  }

  function openAddTask(status: TaskStatus) {
    setDefaultTaskStatus(status)
    setTaakKey((k) => k + 1)
    setNieuweTaakOpen(true)
  }

  function handleTaskCreated(task: Task) {
    if (task.project_id !== project.id) return
    const newTask: TaskWithRelations = {
      ...task,
      project:       { id: project.id, naam: project.naam, kleur: project.kleur },
      assignees:     [],
      labels:        [],
      subtasks:      [],
      subtask_done:  0,
      subtask_total: 0,
    }
    setLocalTasks((prev) => [...prev, newTask])
  }

  async function handleToggleFavorite() {
    const wasFav = isFavorite
    setProject((p) => ({
      ...p,
      favorites: wasFav ? [] : [{ user_id: 'optimistic' }],
    }))
    startTransition(() => { toggleFavorite(project.id) })
  }

  function handleDateSave() {
    setProject((p) => ({
      ...p,
      start_date: startDateVal || null,
      deadline: deadlineVal || null,
    }))
    setEditingDate(false)
    startTransition(() => {
      updateProject(project.id, {
        start_date: startDateVal || null,
        deadline: deadlineVal || null,
      })
    })
  }

  function handleDateCancel() {
    setStartDateVal(project.start_date ?? '')
    setDeadlineVal(project.deadline ?? '')
    setEditingDate(false)
  }

  function handleBeschrijvingSave() {
    const next = beschrijvingVal.trim() || null
    setEditingBeschrijving(false)
    if (next === (project.beschrijving ?? null)) return
    setProject((p) => ({ ...p, beschrijving: next }))
    startTransition(() => {
      updateProject(project.id, { beschrijving: next })
    })
  }

  function handleBeschrijvingCancel() {
    setBeschrijvingVal(project.beschrijving ?? '')
    setEditingBeschrijving(false)
  }

  function handleDocumentsChange(docs: ProjectDocument[]) {
    setProject((p) => ({ ...p, documents: docs }))
  }

  function handleAssigneesChange(assignees: ProjectAssigneeProfile[]) {
    setProject((p) => ({ ...p, assignees }))
  }

  function handleStatusChange(newStatus: ProjectStatus) {
    setStatusOpen(false)
    if (newStatus === project.status) return
    setProject((p) => ({ ...p, status: newStatus }))
    startTransition(() => { updateProject(project.id, { status: newStatus }) })
  }

  // ── Status / priority info ──────────────────────────────────────────────────

  const statusCol = PROJECT_COLUMNS.find((c) => c.status === project.status)
  const prioConfig = project.prioriteit !== 'normaal' ? PRIORITY_CONFIG[project.prioriteit] : null
  const prioIcon = project.prioriteit !== 'normaal' ? PRIORITY_ICON[project.prioriteit] : null

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Breadcrumb bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push('/projecten')}
            className="text-fg-3 shrink-0"
            aria-label="Terug naar overzicht"
          >
            <SvgIcon name="arrow-left" size={15} />
          </Button>

          <SvgIcon name="chart-kanban" size={14} className="text-fg-3 shrink-0" />
          <span className="text-[12px] text-fg-3">Projecten</span>
          <SvgIcon name="chevron-right" size={10} className="text-fg-disabled shrink-0" />
          <span className="text-[12px] text-fg-1 font-medium truncate">{project.naam}</span>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleToggleFavorite}
            className="shrink-0"
            aria-label={isFavorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
          >
            <SvgIcon name="star"
              size={14}
              className={isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-fg-3 hover:text-fg-2'}
            />
          </Button>
        </div>

        <Button
          size="sm"
          onClick={() => { setTaakKey((k) => k + 1); setNieuweTaakOpen(true) }}
          className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
        >
          <SvgIcon name="plus" size={13} />
          Nieuwe taak
        </Button>
      </div>

      {/* ── Tab navigation ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium border-b-2 transition-colors',
                tab === t.id
                  ? 'border-fg-1 text-fg-1'
                  : 'border-transparent text-fg-3 hover:text-fg-2',
              )}
            >
              <SvgIcon name={t.icon} size={13} className="shrink-0" />
              {t.label}
              {t.id === 'taken' && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-sm bg-bg-3 text-[10px] text-fg-3">
                  {taskCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right-side tab icons */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-fg-3"
            aria-label="Activiteit"
            onClick={() => setTab('activiteit')}
          >
            <SvgIcon name="message-square" size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-fg-3"
            aria-label="Weergave wisselen"
          >
            <SvgIcon name="layout-grid" size={14} />
          </Button>
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* ── Overzicht tab ── */}
        {tab === 'overzicht' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Project overview header */}
            <div className="w-full max-w-8/12 mx-auto px-8 pt-6 pb-4 shrink-0 flex flex-col gap-3">
              {/* Project number */}
              <span className="text-[12px] font-mono text-fg-3">
                FLT-{project.project_number}
              </span>

              {/* Title */}
              <h1 className="text-[28px] font-semibold text-fg-1 leading-tight">
                {project.naam}
              </h1>

              {/* Description — click to edit inline */}
              {editingBeschrijving ? (
                <textarea
                  ref={(el) => { el?.focus() }}
                  value={beschrijvingVal}
                  onChange={(e) => setBeschrijvingVal(e.target.value)}
                  onBlur={handleBeschrijvingSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      handleBeschrijvingCancel()
                    }
                  }}
                  rows={3}
                  placeholder="Voeg een korte beschrijving toe..."
                  aria-label="Projectbeschrijving"
                  className="bg-transparent outline-none resize-none text-[13px] text-fg-1 placeholder:text-fg-3 w-full"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingBeschrijving(true)}
                  className="text-[13px] text-fg-3 text-left w-full whitespace-pre-wrap hover:text-fg-2 transition-colors"
                  title="Beschrijving bewerken"
                >
                  {project.beschrijving || 'Voeg een korte beschrijving toe...'}
                </button>
              )}

              {/* ── Metadata row 1: priority + status + assignees + date range ── */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* Priority */}
                {prioConfig && prioIcon && (
                  <div className="flex items-center gap-1">
                    <span style={{ color: prioConfig.color }}>
                      <SvgIcon name={prioIcon} size={13} />
                    </span>
                    <span className="text-[12px] text-fg-2">{prioConfig.label}</span>
                  </div>
                )}

                {/* Status — click to change */}
                {statusCol && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setStatusOpen((v) => !v)}
                      className="flex items-center gap-1 rounded hover:bg-bg-3 px-1 py-0.5 -mx-1 transition-colors"
                      title="Status wijzigen"
                    >
                      <SvgIcon name={statusCol.iconName} size={13} className={statusCol.textClass} />
                      <span className="text-[12px] text-fg-2">{statusCol.label}</span>
                    </button>
                    {statusOpen && (
                      <>
                        <button
                          type="button"
                          aria-label="Sluit statusmenu"
                          className="fixed inset-0 z-10 cursor-default"
                          onClick={() => setStatusOpen(false)}
                        />
                        <div className="absolute top-full left-0 mt-1 z-20 bg-bg-2 border border-border-subtle rounded-lg shadow-lg py-1 min-w-[160px]">
                          {PROJECT_COLUMNS.map((col) => (
                            <button
                              key={col.status}
                              type="button"
                              onClick={() => handleStatusChange(col.status)}
                              className={cn(
                                'w-full text-left flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-bg-3 transition-colors',
                                project.status === col.status ? 'text-fg-1 font-medium' : 'text-fg-2',
                              )}
                            >
                              <SvgIcon name={col.iconName} size={13} className={col.textClass} />
                              {col.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Assignees — click to manage */}
                <button
                  type="button"
                  onClick={() => setAssigneesOpen(true)}
                  className="flex items-center gap-1.5 rounded hover:bg-bg-3 px-1 py-0.5 -mx-1 transition-colors"
                  title="Verantwoordelijken beheren"
                >
                  {project.assignees.length > 0 ? (
                    <>
                      <div className="flex items-center">
                        {project.assignees.slice(0, 3).map((a, i) => (
                          <Avatar
                            key={a.profile_id}
                            src={a.profiles?.avatar_url}
                            name={a.profiles?.full_name ?? undefined}
                            size={18}
                            className={cn(i > 0 && '-ml-1 ring-1 ring-bg-1')}
                          />
                        ))}
                      </div>
                      <span className="text-[12px] text-fg-2">
                        {project.assignees
                          .slice(0, 2)
                          .map((a) => a.profiles?.full_name?.split(' ')[0] ?? '')
                          .filter(Boolean)
                          .join(' & ')}
                        {project.assignees.length > 2 && ` +${project.assignees.length - 2}`}
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1 text-[12px] text-fg-3">
                      <SvgIcon name="users" size={13} />
                      Toevoegen
                    </span>
                  )}
                </button>

                {/* Date range — click to edit */}
                {editingDate ? (
                  <div className="flex items-center gap-2">
                    <DatePicker
                      value={startDateVal}
                      onChange={setStartDateVal}
                      placeholder="Startdatum"
                      clearable={false}
                      className="h-7 w-auto text-[12px]"
                    />
                    <span className="text-[10px] text-fg-3">→</span>
                    <DatePicker
                      value={deadlineVal}
                      onChange={setDeadlineVal}
                      placeholder="Deadline"
                      clearable={false}
                      className="h-7 w-auto text-[12px]"
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={handleDateSave}
                      className="text-green-500"
                      aria-label="Datums opslaan"
                    >
                      <SvgIcon name="check" size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={handleDateCancel}
                      className="text-fg-3"
                      aria-label="Annuleren"
                    >
                      <SvgIcon name="x" size={13} />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingDate(true)}
                    className="flex items-center gap-1.5 rounded hover:bg-bg-3 px-1 py-0.5 -mx-1 transition-colors"
                    title="Datums bewerken"
                  >
                    <SvgIcon name="calendar" size={13} className="text-fg-3" />
                    {project.start_date || project.deadline ? (
                      <span className="text-[12px] text-fg-2 tabular-nums">
                        {project.start_date ? fmtDate(project.start_date) : '—'}
                        <span className="mx-1 text-fg-3">→</span>
                        {project.deadline ? fmtDate(project.deadline) : '—'}
                      </span>
                    ) : (
                      <span className="text-[12px] text-fg-3">Datum instellen</span>
                    )}
                  </button>
                )}
              </div>

              {/* ── Metadata row 2: client + labels + documents ── */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* Client */}
                {project.klanten && (
                  <div className="flex items-center gap-1.5">
                    <SvgIcon name="users" size={13} className="text-fg-3" />
                    <span className="text-[12px] text-fg-2">{project.klanten.naam}</span>
                  </div>
                )}

                {/* Labels */}
                {project.labels.map((label) => (
                  <div key={label.id} className="flex items-center gap-1">
                    <span
                      className="size-[8px] rounded-full shrink-0"
                      style={{ backgroundColor: label.kleur }}
                    />
                    <span className="text-[12px] text-fg-2">{label.naam}</span>
                  </div>
                ))}

                {/* Documents */}
                {project.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[12px] text-fg-2 hover:text-fg-1 transition-colors"
                  >
                    <DocumentIcon type={doc.type} url={doc.url} size={12} />
                    {doc.naam}
                  </a>
                ))}

                {/* Add document button */}
                <button
                  type="button"
                  onClick={() => setBijlageOpen(true)}
                  className="flex items-center gap-1 text-[12px] text-fg-3 hover:text-fg-1 transition-colors"
                >
                  <SvgIcon name="plus" size={12} />
                  Bijlage
                </button>
              </div>
            </div>

            {/* Embedded kanban */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <KanbanBoard
                tasks={filteredTasks}
                onTaskClick={openTaskDetail}
                onAddTask={openAddTask}
                onMove={handleMoveTask}
              />
            </div>
          </div>
        )}

        {/* ── Taken tab ── */}
        {tab === 'taken' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Filters toolbar */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border-subtle shrink-0">
              <div className="flex items-center gap-1.5 bg-bg-3 rounded-full px-3 h-7 w-[220px]">
                <SvgIcon name="magnifying-glass" size={13} className="text-fg-3 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Zoek taak..."
                  aria-label="Zoek taak in project"
                  className="bg-transparent text-[12px] text-fg-1 placeholder:text-fg-3 outline-none flex-1 min-w-0"
                />
              </div>

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

              <span className="ml-auto text-[12px] text-fg-3">
                {filteredTasks.length} taken
              </span>
            </div>

            {/* Task list table */}
            <TakenLijstView tasks={filteredTasks} onTaskClick={openTaskDetail} />
          </div>
        )}

        {/* ── Activiteit tab ── */}
        {tab === 'activiteit' && (
          <div className="flex items-center justify-center h-full text-center">
            <div className="flex flex-col items-center gap-2">
              <SvgIcon name="chart-gantt" size={28} className="text-fg-disabled" />
              <span className="text-[13px] text-fg-3">Activiteitenfeed komt binnenkort.</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Drawers ── */}
      <TaakDetailDrawer
        task={selectedTask}
        open={detailOpen}
        onOpenChange={(v) => { setDetailOpen(v); if (!v) setSelectedTask(null) }}
        onDelete={() => setDetailOpen(false)}
      />

      <NieuweTaakDrawer
        key={`taak-${taakKey}`}
        open={nieuweTaakOpen}
        onOpenChange={setNieuweTaakOpen}
        projects={[initialProject]}
        defaultStatus={defaultTaskStatus}
        defaultProjectId={initialProject.id}
        onCreated={handleTaskCreated}
      />

      {/* ── Modals ── */}
      <BijlageModal
        open={bijlageOpen}
        onOpenChange={setBijlageOpen}
        projectId={project.id}
        documents={project.documents}
        onDocumentsChange={handleDocumentsChange}
      />

      <AssigneesModal
        open={assigneesOpen}
        onOpenChange={setAssigneesOpen}
        projectId={project.id}
        assignees={project.assignees}
        teamMembers={teamMembers}
        onAssigneesChange={handleAssigneesChange}
      />
    </div>
  )
}

// ─── Taken lijst view ────────────────────────────────────────────────────────

function TakenLijstView({
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
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-24">Status</th>
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-24">Prioriteit</th>
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-24">Deadline</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const prio = PRIORITY_CONFIG[task.prioriteit]
            const status = KANBAN_COLUMNS.find((c) => c.status === task.status)
            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="border-b border-border-subtle/50 hover:bg-bg-2 cursor-pointer transition-colors"
              >
                <td className="py-2.5 pr-3 text-[11px] font-mono text-fg-3">FLT-{task.task_number}</td>
                <td className="py-2.5 pr-3 text-[13px] text-fg-1 max-w-[300px] truncate">{task.titel}</td>
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
