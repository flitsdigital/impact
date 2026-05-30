'use client'

import { useState } from 'react'
import { Drawer } from 'vaul'
import { cn } from '@/lib/utils'
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
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Drawer.Content
          className="fixed top-0 right-0 bottom-0 z-50 flex flex-col w-[420px] max-w-[95vw] bg-bg-1 border-l border-border-subtle outline-none"
          data-vaul-no-drag
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
            <span className="text-[15px] font-medium text-fg-1">Nieuwe taak</span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1 rounded text-fg-3 hover:text-fg-1 hover:bg-bg-4 transition-colors"
              data-vaul-no-drag
            >
              <X size={16} />
            </button>
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
              <select
                id="taak-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="bg-bg-2 border border-border-subtle rounded-lg px-3 py-2 text-[13px] text-fg-1 outline-none focus:border-border-strong transition-colors"
                data-vaul-no-drag
              >
                <option value="">Selecteer een project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.naam}</option>
                ))}
              </select>
            </div>

            {/* Status + Priority row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="taak-status" className="text-[12px] text-fg-2">Status</label>
                <select
                  id="taak-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="bg-bg-2 border border-border-subtle rounded-lg px-3 py-2 text-[13px] text-fg-1 outline-none focus:border-border-strong transition-colors"
                  data-vaul-no-drag
                >
                  {KANBAN_COLUMNS.map((col) => (
                    <option key={col.status} value={col.status}>{col.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="taak-prioriteit" className="text-[12px] text-fg-2">Prioriteit</label>
                <select
                  id="taak-prioriteit"
                  value={prioriteit}
                  onChange={(e) => setPrioriteit(e.target.value as TaskPriority)}
                  className="bg-bg-2 border border-border-subtle rounded-lg px-3 py-2 text-[13px] text-fg-1 outline-none focus:border-border-strong transition-colors"
                  data-vaul-no-drag
                >
                  {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                    <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                  ))}
                </select>
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
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="fl-btn-ghost text-[13px]"
              data-vaul-no-drag
            >
              Annuleer
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !titel.trim() || !projectId}
              className="fl-btn-primary text-[13px] disabled:opacity-50"
              data-vaul-no-drag
            >
              {loading ? 'Aanmaken...' : 'Taak aanmaken'}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
