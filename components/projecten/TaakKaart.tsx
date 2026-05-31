'use client'

import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { SvgIcon } from '@/components/ui/SvgIcon'
import type { TaskWithRelations } from '@/types/project'
import { PRIORITY_CONFIG, PRIORITY_ICON } from '@/types/project'

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  })
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr + 'T23:59:59') < new Date()
}

interface TaakKaartProps {
  task:        TaskWithRelations
  isDragging:  boolean
  showProject?: boolean
  onClick?:    () => void
}

export function TaakKaart({ task, isDragging, showProject = false, onClick }: TaakKaartProps) {
  const prio      = task.prioriteit !== 'normaal' ? PRIORITY_CONFIG[task.prioriteit] : null
  const prioIcon  = task.prioriteit !== 'normaal' ? PRIORITY_ICON[task.prioriteit] : null
  const assignees = task.assignees ?? []
  const dateLabel = task.deadline ? fmtDate(task.deadline) : null
  const over      = task.deadline ? isOverdue(task.deadline) : false
  const progress  = task.subtask_total > 0
    ? Math.round((task.subtask_done / task.subtask_total) * 100)
    : null

  // Progress bar color matches task status (orange in-progress, blue feedback, green done)
  const progressColor = progress === 100
    ? '#46A557'
    : task.status === 'feedback'
    ? '#0072F5'
    : '#FFB223'

  const hasFooter = task.subtask_total > 0 || !!dateLabel

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-bg-2 rounded p-2 flex flex-col gap-1.5 cursor-pointer hover:bg-bg-3 transition-colors select-none',
        isDragging && 'opacity-40 scale-95',
      )}
    >
      {/* Row 1: assignee avatars + task ID | priority */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {assignees.length > 0 && (
            <div className="flex items-center shrink-0">
              {assignees.slice(0, 3).map((a, i) => (
                <Avatar
                  key={a.profile_id}
                  src={a.profiles?.avatar_url}
                  name={a.profiles?.full_name ?? undefined}
                  size={14}
                  className={cn(i > 0 && '-ml-[1.4px] ring-1 ring-bg-2')}
                />
              ))}
              {assignees.length > 3 && (
                <span className="-ml-[1.4px] size-[14px] rounded-full bg-bg-3 text-[9px] flex items-center justify-center text-fg-3 ring-1 ring-bg-2">
                  +{assignees.length - 3}
                </span>
              )}
            </div>
          )}
          <span className="text-[12px] font-mono text-fg-3 shrink-0">
            FLT-{task.task_number}
          </span>
        </div>

        {/* Priority: icon + label in muted color — no colored pill */}
        {prio && prioIcon && (
          <div className="flex items-center gap-1 shrink-0">
            <span style={{ color: prio.color }}>
              <SvgIcon name={prioIcon} size={13} />
            </span>
            <span className="text-[11px] text-fg-3">{prio.label}</span>
          </div>
        )}
      </div>

      {/* Row 2: task title */}
      <p className="text-[12px] font-medium text-fg-1 leading-snug line-clamp-2">
        {task.titel}
      </p>

      {/* Row 3: project indicator — only in cross-project views */}
      {showProject && task.project && (
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="size-1.5 rounded-full shrink-0"
            style={{ backgroundColor: task.project.kleur }}
          />
          <span className="text-[11px] text-fg-3 truncate">{task.project.naam}</span>
        </div>
      )}

      {/* Row 4: subtask list (max 3) + progress bar */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {task.subtasks.slice(0, 3).map((sub) => (
            <div key={sub.id} className="flex items-center gap-1.5 min-w-0">
              <SvgIcon name="corner-down-right" size={11} className="text-fg-disabled shrink-0" />
              <SvgIcon name="circle-dashed" size={11} className="text-fg-3 shrink-0" />
              <span className="text-[11px] text-fg-3 truncate flex-1">{sub.titel}</span>
            </div>
          ))}
          {task.subtasks.length > 3 && (
            <span className="text-[10px] text-fg-disabled ml-4">
              +{task.subtasks.length - 3} meer
            </span>
          )}
          {progress !== null && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-fg-3 tabular-nums shrink-0">{progress}%</span>
              <div className="flex-1 h-[2px] rounded-full bg-bg-4 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progress}%`, backgroundColor: progressColor }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer: subtask count + deadline */}
      {hasFooter && (
        <>
          <div className="h-px bg-border-subtle" />
          <div className="flex items-center gap-3">
            {task.subtask_total > 0 && (
              <div className="flex items-center gap-1">
                <SvgIcon name="list-check" size={13} className="text-fg-3 shrink-0" />
                <span className="text-[11px] text-fg-3">
                  {task.subtask_done} / {task.subtask_total}
                </span>
              </div>
            )}
            {dateLabel && (
              <div className="flex items-center gap-1">
                <SvgIcon
                  name="calendar"
                  size={13}
                  className={cn('shrink-0', over ? 'text-orange-500' : 'text-fg-3')}
                />
                <span className={cn('text-[11px] tabular-nums', over ? 'text-orange-500 font-medium' : 'text-fg-3')}>
                  {dateLabel}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
