'use client'

import { useState } from 'react'
import { DrawerClose } from '@/components/ui/Drawer'
import {
  AppDrawer,
  AppDrawerHeader,
  AppDrawerMeta,
  AppDrawerBody,
  AppDrawerFooter,
} from '@/components/ui/AppDrawer'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Textarea } from '@/components/ui/Textarea'
import { PillSelect } from '@/components/ui/PillSelect'
import { SvgIcon } from '@/components/ui/SvgIcon'
import type { Project, Task, TaskStatus, TaskPriority } from '@/types/project'
import { PRIORITY_CONFIG, PRIORITY_ICON, KANBAN_COLUMNS } from '@/types/project'
import { createTask } from '@/app/(app)/projecten/actions'

interface NieuweTaakDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: Project[]
  defaultStatus?: TaskStatus
  defaultProjectId?: string
  onCreated?: (task: Task) => void
}

export function NieuweTaakDrawer({
  open,
  onOpenChange,
  projects,
  defaultStatus = 'todo',
  defaultProjectId,
  onCreated,
}: NieuweTaakDrawerProps) {
  const [titel, setTitel] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? '')
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [prioriteit, setPrioriteit] = useState<TaskPriority>('normaal')
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const statusCol = KANBAN_COLUMNS.find((c) => c.status === status)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titel.trim() || !projectId) {
      setError('Vul een titel en project in.')
      return
    }

    setLoading(true)
    setError(null)

    const fd = new FormData()
    fd.set('project_id', projectId)
    fd.set('titel', titel.trim())
    fd.set('beschrijving', beschrijving.trim())
    fd.set('status', status)
    fd.set('prioriteit', prioriteit)
    if (deadline) fd.set('deadline', deadline)

    const result = await createTask(null, fd)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      if (result.task) onCreated?.(result.task)
      onOpenChange(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit(e)
  }

  return (
    <AppDrawer open={open} onOpenChange={onOpenChange} title="Nieuwe taak" width={520}>
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        data-vaul-no-drag
        className="flex h-full flex-col"
      >
        <AppDrawerHeader>
          <div className="flex items-center gap-2 text-muted-foreground">
            <SvgIcon name="list-check" size={14} />
            <span className="text-sm font-medium text-foreground">Nieuwe taak</span>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon-sm" type="button" className="text-muted-foreground" aria-label="Sluiten">
              <SvgIcon name="x" size={14} />
            </Button>
          </DrawerClose>
        </AppDrawerHeader>

        <AppDrawerMeta>
          {/* Project */}
          <PillSelect
            value={projectId}
            onChange={setProjectId}
            icon="chart-kanban"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.naam}</option>
            ))}
          </PillSelect>

          {/* Status */}
          <PillSelect
            value={status}
            onChange={(v) => setStatus(v as TaskStatus)}
            icon={statusCol?.iconName ?? 'circle-dashed'}
          >
            {KANBAN_COLUMNS.map((col) => (
              <option key={col.status} value={col.status}>{col.label}</option>
            ))}
          </PillSelect>

          {/* Prioriteit */}
          <PillSelect
            value={prioriteit}
            onChange={(v) => setPrioriteit(v as TaskPriority)}
            icon={PRIORITY_ICON[prioriteit]}
          >
            {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
            ))}
          </PillSelect>

          {/* Deadline */}
          <DatePicker
            variant="pill"
            value={deadline}
            onChange={setDeadline}
            placeholder="Deadline"
            aria-label="Deadline"
          />
        </AppDrawerMeta>

        <AppDrawerBody>
          {/* Titel */}
          <input
            type="text"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Wat moet er gedaan worden?"
            aria-label="Taaktitel"
            autoFocus
            className="bg-transparent outline-none text-[18px] font-semibold text-fg-1 placeholder:text-fg-disabled w-full shrink-0"
          />

          {/* Beschrijving */}
          <Textarea
            value={beschrijving}
            onChange={(e) => setBeschrijving(e.target.value)}
            placeholder="Optionele beschrijving..."
            className="flex-1 min-h-[140px] bg-secondary border-0 rounded-md text-xs placeholder:text-xs focus-visible:ring-1 focus-visible:ring-ring/50 resize-none"
          />

          {error && <p className="text-xs text-destructive shrink-0">{error}</p>}
        </AppDrawerBody>

        <AppDrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" size="sm" type="button">Annuleren</Button>
          </DrawerClose>
          <Button type="submit" size="sm" disabled={loading || !titel.trim() || !projectId} className="gap-1.5">
            <SvgIcon name="save" size={13} />
            {loading ? 'Aanmaken...' : 'Taak aanmaken'}
            <span className="flex items-center gap-0.5 ml-1 opacity-50">
              <kbd className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-sm bg-primary-foreground/10">⌘</kbd>
              <kbd className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-sm bg-primary-foreground/10">↵</kbd>
            </span>
          </Button>
        </AppDrawerFooter>
      </form>
    </AppDrawer>
  )
}
