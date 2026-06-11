'use client'

import { useState, useEffect, useRef } from 'react'
import { DrawerClose } from '@/components/ui/Drawer'
import {
  AppDrawer,
  AppDrawerHeader,
  AppDrawerMeta,
  AppDrawerBody,
  AppDrawerFooter,
} from '@/components/ui/AppDrawer'
import { PillSelect } from '@/components/ui/PillSelect'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'
import type { TaskWithRelations, TaskStatus, TaskPriority } from '@/types/project'
import { PRIORITY_CONFIG, KANBAN_COLUMNS } from '@/types/project'
import { updateTask, deleteTask, addComment } from '@/app/(app)/projecten/actions'
import { SvgIcon } from '@/components/ui/SvgIcon'
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

  const statusIcon = KANBAN_COLUMNS.find((c) => c.status === status)?.iconName

  return (
    <AppDrawer open={open} onOpenChange={onOpenChange} title={`Taak FLT-${task?.task_number ?? ''}`}>
      {/* Header */}
      <AppDrawerHeader className="items-start py-4">
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
            <SvgIcon name="x" size={16} />
          </Button>
        </DrawerClose>
      </AppDrawerHeader>

      {/* Meta: status + priority + deadline */}
      <AppDrawerMeta>
        <PillSelect value={status} onChange={(v) => setStatus(v as TaskStatus)} icon={statusIcon}>
          {KANBAN_COLUMNS.map((col) => (
            <option key={col.status} value={col.status}>{col.label}</option>
          ))}
        </PillSelect>

        <PillSelect value={prioriteit} onChange={(v) => setPrioriteit(v as TaskPriority)} icon="signal-bars">
          {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
          ))}
        </PillSelect>

        <DatePicker
          variant="pill"
          value={deadline}
          onChange={setDeadline}
          placeholder="Deadline"
        />
      </AppDrawerMeta>

      {/* Body */}
      <AppDrawerBody className="gap-5">
        {/* Project info (read-only) */}
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
          <Textarea
            id="detail-beschrijving"
            value={beschrijving}
            onChange={(e) => setBeschrijving(e.target.value)}
            rows={4}
            placeholder="Voeg een beschrijving toe..."
            className="min-h-0 bg-bg-2 text-[13px] placeholder:text-fg-3"
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
            <SvgIcon name="message-square" size={12} />
            Reactie toevoegen
          </label>
          <form onSubmit={handleAddComment} className="flex flex-col gap-2" data-vaul-no-drag>
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
              placeholder="Schrijf een reactie..."
              className="min-h-0 bg-bg-2 text-[13px] placeholder:text-fg-3"
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
      </AppDrawerBody>

      {/* Footer */}
      <AppDrawerFooter className="justify-between">
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
            <SvgIcon name="trash" size={15} />
          </Button>
        )}

        <div className="flex items-center gap-2">
          <Button onClick={() => onOpenChange(false)} variant="ghost" data-vaul-no-drag>
            Annuleer
          </Button>
          <Button onClick={handleSave} disabled={saving} data-vaul-no-drag>
            {saving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </AppDrawerFooter>
    </AppDrawer>
  )
}
