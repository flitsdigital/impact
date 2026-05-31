'use client'

import { useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerTitle,
} from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import type { Project, Task, TaskStatus, TaskPriority } from '@/types/project'
import { PRIORITY_CONFIG, KANBAN_COLUMNS } from '@/types/project'
import { createTask } from '@/app/(app)/projecten/actions'
import { X } from 'lucide-react'

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

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-[420px] max-w-[95vw] sm:max-w-[420px] border-l border-border-subtle bg-bg-1">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
          <DrawerTitle className="text-[15px] font-medium text-fg-1">Nieuwe taak</DrawerTitle>
          <DrawerClose asChild data-vaul-no-drag>
            <Button variant="ghost" size="icon-sm" aria-label="Sluiten">
              <X size={16} />
            </Button>
          </DrawerClose>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4 overflow-y-auto flex-1">

          {/* Titel */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="taak-titel" className="text-[12px] text-fg-2">Titel <span className="text-orange-500">*</span></label>
            <input
              id="taak-titel"
              type="text"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="Wat moet er gedaan worden?"
              autoFocus
              className="bg-bg-2 border border-border-subtle rounded-lg px-3 py-2 text-[14px] text-fg-1 placeholder:text-fg-3 outline-none focus:border-border-strong transition-colors"
              data-vaul-no-drag
            />
          </div>

          {/* Project */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="taak-project" className="text-[12px] text-fg-2">Project <span className="text-orange-500">*</span></label>
            <Select value={projectId} onValueChange={(v) => setProjectId(v ?? '')}>
              <SelectTrigger id="taak-project" className="w-full" data-vaul-no-drag>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="taak-status" className="text-[12px] text-fg-2">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger id="taak-status" className="w-full" data-vaul-no-drag>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {KANBAN_COLUMNS.map((col) => (
                      <SelectItem key={col.status} value={col.status}>{col.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="taak-prioriteit" className="text-[12px] text-fg-2">Prioriteit</label>
              <Select value={prioriteit} onValueChange={(v) => setPrioriteit(v as TaskPriority)}>
                <SelectTrigger id="taak-prioriteit" className="w-full" data-vaul-no-drag>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                      <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deadline */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="taak-deadline" className="text-[12px] text-fg-2">Deadline</label>
            <input
              id="taak-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-bg-2 border border-border-subtle rounded-lg px-3 py-2 text-[13px] text-fg-1 outline-none focus:border-border-strong transition-colors"
              data-vaul-no-drag
            />
          </div>

          {/* Beschrijving */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="taak-beschrijving" className="text-[12px] text-fg-2">Beschrijving</label>
            <textarea
              id="taak-beschrijving"
              value={beschrijving}
              onChange={(e) => setBeschrijving(e.target.value)}
              rows={3}
              placeholder="Optionele beschrijving..."
              className="bg-bg-2 border border-border-subtle rounded-lg px-3 py-2 text-[13px] text-fg-1 placeholder:text-fg-3 outline-none resize-none focus:border-border-strong transition-colors"
              data-vaul-no-drag
            />
          </div>

          {error && (
            <p className="text-[12px] text-orange-400 bg-orange-400/10 rounded px-3 py-2">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-subtle shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            data-vaul-no-drag
          >
            Annuleer
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !titel.trim() || !projectId}
            data-vaul-no-drag
          >
            {loading ? 'Aanmaken...' : 'Taak aanmaken'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
