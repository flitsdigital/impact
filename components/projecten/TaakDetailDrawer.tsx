'use client'

import { useState, useEffect, useRef } from 'react'
import { Drawer } from 'vaul'
import { cn } from '@/lib/utils'
import type { TaskWithRelations, TaskStatus, TaskPriority } from '@/types/project'
import { PRIORITY_CONFIG, KANBAN_COLUMNS } from '@/types/project'
import { updateTask, deleteTask, addComment } from '@/app/(app)/projecten/actions'
import { X, Trash2, MessageSquare } from 'lucide-react'

interface TaakDetailDrawerProps {
  task: TaskWithRelations | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: (taskId: string) => void
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function TaakDetailDrawer({ task, open, onOpenChange, onDelete }: TaakDetailDrawerProps) {
  const [titel, setTitel] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [prioriteit, setPrioriteit] = useState<TaskPriority>('normaal')
  const [deadline, setDeadline] = useState('')
  const [commentText, setCommentText] = useState('')
  const [saving, setSaving] = useState(false)
  const [commentLoading, setCommentLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && task) {
      setTitel(task.titel)
      setBeschrijving(task.beschrijving ?? '')
      setStatus(task.status)
      setPrioriteit(task.prioriteit)
      setDeadline(task.deadline ?? '')
      setDeleteConfirm(false)
      setCommentText('')
    }
  }, [open, task])

  async function handleSave() {
    if (!task) return
    setSaving(true)
    await updateTask(task.id, {
      titel: titel.trim() || task.titel,
      beschrijving: beschrijving.trim() || null,
      status,
      prioriteit,
      deadline: deadline || null,
    })
    setSaving(false)
    onOpenChange(false)
  }

  async function handleDelete() {
    if (!task) return
    await deleteTask(task.id)
    onDelete?.(task.id)
    onOpenChange(false)
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!task || !commentText.trim()) return
    setCommentLoading(true)
    await addComment(task.id, commentText.trim())
    setCommentText('')
    setCommentLoading(false)
  }

  const prio = PRIORITY_CONFIG[prioriteit]

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Drawer.Content
          className="fixed top-0 right-0 bottom-0 z-50 flex flex-col w-[480px] max-w-[95vw] bg-bg-1 border-l border-border-subtle outline-none"
          data-vaul-no-drag
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border-subtle shrink-0">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] text-fg-3 font-mono">
                FLT-{task?.task_number}
              </span>
              <input
                ref={titleRef}
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                className="text-[16px] font-medium text-fg-1 bg-transparent border-none outline-none w-full"
                placeholder="Taaktitel..."
                aria-label="Taaktitel"
                data-vaul-no-drag
              />
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="shrink-0 p-1 rounded text-fg-3 hover:text-fg-1 hover:bg-bg-4 transition-colors mt-1"
              data-vaul-no-drag
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col gap-5 px-5 py-4 overflow-y-auto flex-1 min-h-0">

            {/* Meta row: status + priority + deadline */}
            <div className="flex flex-wrap gap-2" data-vaul-no-drag>
              {/* Status */}
              <div className="flex flex-col gap-1">
                <label htmlFor="detail-status" className="text-[11px] text-fg-3 uppercase tracking-wide">Status</label>
                <select
                  id="detail-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="text-[12px] bg-bg-3 border border-border-subtle rounded px-2 py-1 text-fg-1 outline-none"
                  data-vaul-no-drag
                >
                  {KANBAN_COLUMNS.map((col) => (
                    <option key={col.status} value={col.status}>{col.label}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="flex flex-col gap-1">
                <label htmlFor="detail-prioriteit" className="text-[11px] text-fg-3 uppercase tracking-wide">Prioriteit</label>
                <select
                  id="detail-prioriteit"
                  value={prioriteit}
                  onChange={(e) => setPrioriteit(e.target.value as TaskPriority)}
                  className="text-[12px] bg-bg-3 border border-border-subtle rounded px-2 py-1 text-fg-1 outline-none"
                  data-vaul-no-drag
                >
                  {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                    <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                  ))}
                </select>
              </div>

              {/* Deadline */}
              <div className="flex flex-col gap-1">
                <label htmlFor="detail-deadline" className="text-[11px] text-fg-3 uppercase tracking-wide">Deadline</label>
                <input
                  id="detail-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="text-[12px] bg-bg-3 border border-border-subtle rounded px-2 py-1 text-fg-1 outline-none"
                  data-vaul-no-drag
                />
              </div>
            </div>

            {/* Project + assignees info (read-only) */}
            {task?.project && (
              <div className="flex items-center gap-2 text-[12px] text-fg-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: task.project.kleur }}
                />
                <span>{task.project.naam}</span>
              </div>
            )}

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label htmlFor="detail-beschrijving" className="text-[11px] text-fg-3 uppercase tracking-wide">Beschrijving</label>
              <textarea
                id="detail-beschrijving"
                value={beschrijving}
                onChange={(e) => setBeschrijving(e.target.value)}
                rows={4}
                placeholder="Voeg een beschrijving toe..."
                className="text-[13px] bg-bg-2 border border-border-subtle rounded-lg px-3 py-2 text-fg-1 outline-none resize-none placeholder:text-fg-3 focus:border-border-strong transition-colors"
                data-vaul-no-drag
              />
            </div>

            {/* Subtasks */}
            {(task?.subtask_total ?? 0) > 0 && (
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-fg-3 uppercase tracking-wide">
                  Subtaken ({task?.subtask_done}/{task?.subtask_total})
                </label>
                <div className="h-1.5 rounded-full bg-bg-4 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${task ? (task.subtask_done / task.subtask_total) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  {task?.subtasks.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 text-[12px] text-fg-2">
                      <span className={cn(
                        'w-3 h-3 rounded-full border shrink-0',
                        sub.status === 'klaar'
                          ? 'bg-green-500 border-green-500'
                          : 'border-border-strong',
                      )} />
                      <span className={sub.status === 'klaar' ? 'line-through text-fg-3' : ''}>
                        {sub.titel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comment input */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] text-fg-3 uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquare size={12} />
                Reactie toevoegen
              </label>
              <form onSubmit={handleAddComment} className="flex flex-col gap-2" data-vaul-no-drag>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  placeholder="Schrijf een reactie..."
                  className="text-[13px] bg-bg-2 border border-border-subtle rounded-lg px-3 py-2 text-fg-1 outline-none resize-none placeholder:text-fg-3 focus:border-border-strong transition-colors"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || commentLoading}
                  className="self-end fl-btn-primary text-[12px] disabled:opacity-40"
                >
                  {commentLoading ? 'Verzenden...' : 'Verzenden'}
                </button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-border-subtle shrink-0 gap-3">
            {/* Delete */}
            {deleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-fg-2">Zeker weten?</span>
                <button onClick={handleDelete} className="text-[12px] text-red-400 hover:text-red-300 transition-colors" data-vaul-no-drag>
                  Ja, verwijder
                </button>
                <button onClick={() => setDeleteConfirm(false)} className="text-[12px] text-fg-3 hover:text-fg-1 transition-colors" data-vaul-no-drag>
                  Annuleer
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="p-1.5 rounded text-fg-3 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="Taak verwijderen"
                data-vaul-no-drag
              >
                <Trash2 size={15} />
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenChange(false)}
                className="fl-btn-ghost text-[13px]"
                data-vaul-no-drag
              >
                Annuleer
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="fl-btn-primary text-[13px] disabled:opacity-50"
                data-vaul-no-drag
              >
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
