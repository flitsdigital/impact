'use client'

import { useState, useEffect, useRef } from 'react'
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-[480px] max-w-[95vw] sm:max-w-[480px] border-l border-border-subtle bg-bg-1">
        <DrawerTitle className="sr-only">Taak FLT-{task?.task_number}</DrawerTitle>

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
          <DrawerClose asChild data-vaul-no-drag>
            <Button variant="ghost" size="icon-sm" aria-label="Sluiten" className="mt-1 text-fg-3">
              <X size={16} />
            </Button>
          </DrawerClose>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 px-5 py-4 overflow-y-auto flex-1 min-h-0">

          {/* Meta row: status + priority + deadline */}
          <div className="flex flex-wrap gap-2" data-vaul-no-drag>
            {/* Status */}
            <div className="flex flex-col gap-1">
              <label htmlFor="detail-status" className="text-[11px] text-fg-3 uppercase tracking-wide">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger id="detail-status" size="sm" className="text-[12px]" data-vaul-no-drag>
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

            {/* Priority */}
            <div className="flex flex-col gap-1">
              <label htmlFor="detail-prioriteit" className="text-[11px] text-fg-3 uppercase tracking-wide">Prioriteit</label>
              <Select value={prioriteit} onValueChange={(v) => setPrioriteit(v as TaskPriority)}>
                <SelectTrigger id="detail-prioriteit" size="sm" className="text-[12px]" data-vaul-no-drag>
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
              <Button
                type="submit"
                size="sm"
                disabled={!commentText.trim() || commentLoading}
                className="self-end"
              >
                {commentLoading ? 'Verzenden...' : 'Verzenden'}
              </Button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border-subtle shrink-0 gap-3">
          {/* Delete */}
          {deleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-fg-2">Zeker weten?</span>
              <Button onClick={handleDelete} variant="ghost" size="sm" className="text-red-400 hover:text-red-300" data-vaul-no-drag>
                Ja, verwijder
              </Button>
              <Button onClick={() => setDeleteConfirm(false)} variant="ghost" size="sm" data-vaul-no-drag>
                Annuleer
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setDeleteConfirm(true)}
              variant="ghost"
              size="icon-sm"
              className="text-fg-3 hover:text-red-400 hover:bg-red-400/10"
              title="Taak verwijderen"
              aria-label="Taak verwijderen"
              data-vaul-no-drag
            >
              <Trash2 size={15} />
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              data-vaul-no-drag
            >
              Annuleer
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              data-vaul-no-drag
            >
              {saving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
