'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusChip } from '@/components/ui/StatusChip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
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
import { TakenLijst } from '@/components/taken/TakenLijst'
import { TaakDetailDrawer } from './TaakDetailDrawer'
import { NieuweTaakDrawer } from './NieuweTaakDrawer'
import { BijlageModal } from '@/components/ui/BijlageModal'
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
import { PRIORITY_CONFIG, PRIORITY_ICON, PROJECT_COLUMNS } from '@/types/project'
import type { TeamMember } from '@/types/team'
import {
  moveTask,
  updateProject,
  toggleFavorite,
  addProjectDocument,
  deleteProjectDocument,
  uploadProjectFile,
} from '@/app/(app)/projecten/actions'
import { fmtDate } from '@/lib/dates'
import { DocumentIcon } from '@/components/ui/DocumentIcon'

// ─── Constants ───────────────────────────────────────────────────────────────

type Tab = 'overzicht' | 'taken' | 'activiteit'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overzicht', label: 'Overzicht', icon: 'list-check' },
  { id: 'taken', label: 'Taken', icon: 'list-check-1' },
  { id: 'activiteit', label: 'Activiteit', icon: 'chart-gantt' },
]

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
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* ── Overzicht tab ── */}
        {tab === 'overzicht' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
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
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="flex items-center gap-1 rounded hover:bg-bg-3 px-1 py-0.5 -mx-1 transition-colors outline-none"
                      title="Status wijzigen"
                    >
                      <StatusChip
                        iconName={statusCol.iconName}
                        label={statusCol.label}
                        textClass={statusCol.textClass}
                        iconSize={13}
                        labelClass="text-[12px] text-fg-2"
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[160px]">
                      {PROJECT_COLUMNS.map((col) => (
                        <DropdownMenuItem
                          key={col.status}
                          onSelect={() => handleStatusChange(col.status)}
                          className={cn(
                            'text-[12px]',
                            project.status === col.status ? 'text-fg-1 font-medium' : 'text-fg-2',
                          )}
                        >
                          <SvgIcon name={col.iconName} size={13} className={col.textClass} />
                          {col.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                      <AvatarStack
                        people={project.assignees.map((a) => ({
                          key: a.profile_id,
                          src: a.profiles?.avatar_url,
                          name: a.profiles?.full_name ?? undefined,
                        }))}
                        size={18}
                        overlap={4}
                        ringClass="ring-bg-1"
                        showOverflow={false}
                      />
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

            {/* Embedded kanban — vult de resterende hoogte maar nooit minder dan 40rem */}
            <div className="flex-1 min-h-[40rem] overflow-hidden">
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
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Zoek taak..."
                ariaLabel="Zoek taak in project"
              />

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
            <TakenLijst tasks={filteredTasks} onTaskClick={openTaskDetail} />
          </div>
        )}

        {/* ── Activiteit tab ── */}
        {tab === 'activiteit' && (
          <EmptyState icon="chart-gantt" title="Activiteitenfeed komt binnenkort." />
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
        documents={project.documents}
        onDocumentsChange={handleDocumentsChange}
        makeDocument={(base) => ({
          ...base,
          project_id: project.id,
          created_at: new Date().toISOString(),
        })}
        onAddDocument={(type, naam, url) => addProjectDocument(project.id, type, naam, url)}
        onUploadFile={(formData) => uploadProjectFile(project.id, formData)}
        onDeleteDocument={(docId) => deleteProjectDocument(docId)}
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

