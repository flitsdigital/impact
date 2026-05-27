'use client'

import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import type { Project } from '@/types/project'

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  })
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr + 'T23:59:59') < new Date()
}

interface ProjectKaartProps {
  project:    Project & { klanten?: { id: string; naam: string } | null }
  taskCounts: { total: number; done: number }
  isDragging: boolean
  onClick?:   () => void
}

export function ProjectKaart({ project, taskCounts, isDragging, onClick }: ProjectKaartProps) {
  const { total, done } = taskCounts
  const progress        = total > 0 ? Math.round((done / total) * 100) : null
  const dateLabel       = project.deadline ? fmtDate(project.deadline) : null
  const over            = project.deadline ? isOverdue(project.deadline) : false
  const hasFooter       = total > 0 || !!dateLabel

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-bg-2 rounded p-2 flex flex-col gap-1.5 cursor-pointer hover:bg-bg-3 transition-colors select-none',
        isDragging && 'opacity-40 scale-95',
      )}
    >
      {/* Row 1: project number + client | deadline urgency */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-mono text-fg-3 shrink-0">
            FLT-{project.project_number}
          </span>
          {project.klanten && (
            <>
              <span className="text-fg-disabled text-[10px]">·</span>
              <span className="text-[11px] font-mono text-fg-3 truncate">
                {project.klanten.naam}
              </span>
            </>
          )}
        </div>

        {/* Overdue badge when past deadline */}
        {over && dateLabel && (
          <div className="flex items-center gap-1 shrink-0">
            <span style={{ color: '#f87171' }}>
              <SvgIcon name="triangle-exclamation" size={13} />
            </span>
            <span className="text-[11px] text-fg-3">Verlopen</span>
          </div>
        )}
      </div>

      {/* Row 2: color dot + project name */}
      <div className="flex items-start gap-1.5">
        <span
          className="size-[8px] rounded-full shrink-0 mt-[3px]"
          style={{ backgroundColor: project.kleur }}
        />
        <p className="text-[12px] font-medium text-fg-1 leading-snug line-clamp-2">
          {project.naam}
        </p>
      </div>

      {/* Row 3: task progress */}
      {progress !== null && (
        <div className="flex items-center gap-2">
          <SvgIcon name="circle-notch" size={13} className="shrink-0 text-fg-3" />
          <span className="text-[11px] text-fg-3 tabular-nums w-7 shrink-0">{progress}%</span>
          <div className="flex-1 h-[2px] rounded-full bg-bg-4 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, backgroundColor: project.kleur }}
            />
          </div>
        </div>
      )}

      {/* Footer: task count + deadline */}
      {hasFooter && (
        <>
          <div className="h-px bg-border-subtle" />
          <div className="flex items-center gap-3">
            {total > 0 && (
              <div className="flex items-center gap-1">
                <SvgIcon name="list-check" size={13} className="text-fg-3 shrink-0" />
                <span className="text-[11px] text-fg-3">{done} / {total}</span>
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
