'use client'

import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Avatar } from '@/components/ui/Avatar'
import { PRIORITY_CONFIG, PRIORITY_ICON } from '@/types/project'
import type { Project, ProjectAssigneeProfile } from '@/types/project'

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
  assignees:  ProjectAssigneeProfile[]
  taskCounts: { total: number; done: number }
  isDragging: boolean
  onClick?:   () => void
}

export function ProjectKaart({ project, assignees, taskCounts, isDragging, onClick }: ProjectKaartProps) {
  const { total, done } = taskCounts
  const progress        = total > 0 ? Math.round((done / total) * 100) : null
  const dateLabel       = project.deadline ? fmtDate(project.deadline) : null
  const over            = project.deadline ? isOverdue(project.deadline) : false
  const hasFooter       = total > 0 || !!dateLabel

  const prioConfig = project.prioriteit !== 'normaal' ? PRIORITY_CONFIG[project.prioriteit] : null
  const prioIcon   = project.prioriteit !== 'normaal' ? PRIORITY_ICON[project.prioriteit] : null

  // Progress accent matches project status (green done, blue feedback, orange otherwise)
  const progressColor = progress === 100
    ? '#46A557'
    : project.status === 'feedback'
    ? '#0072F5'
    : '#FFB223'

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-bg-2 rounded p-2 flex flex-col gap-2 cursor-pointer hover:bg-bg-3 transition-colors select-none',
        isDragging && 'opacity-40 scale-95',
      )}
    >
      <div className="flex flex-col gap-1.5 w-full">
        {/* Row 1: assignees + project number | priority */}
        <div className="flex items-center justify-between gap-2 w-full">
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
            <span className="text-[12px] text-fg-3 font-medium tracking-[-0.12px] shrink-0">
              FLT-{project.project_number}
            </span>
          </div>

          {/* Priority badge */}
          {prioConfig && prioIcon && (
            <div className="flex items-center gap-1 shrink-0">
              <span style={{ color: prioConfig.color }}>
                <SvgIcon name={prioIcon} size={14} />
              </span>
              <span className="text-[12px] text-fg-3 font-medium tracking-[-0.12px]">
                {prioConfig.label}
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <p className="text-[12px] font-medium text-fg-1 leading-[1.3] tracking-[-0.12px] line-clamp-2">
          {project.naam}
        </p>

        {/* Progress */}
        {progress !== null && (
          <div className="flex items-center gap-2 w-full">
            <div className="flex items-center gap-1 shrink-0">
              <span style={{ color: progressColor }}>
                <SvgIcon name="circle-notch" size={14} className="shrink-0" />
              </span>
              <span className="text-[12px] text-fg-3 font-medium tabular-nums tracking-[-0.12px]">
                {progress}%
              </span>
            </div>
            <div className="flex-1 h-[2px] rounded-full bg-bg-4 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: progressColor }} />
            </div>
          </div>
        )}
      </div>

      {/* Footer: subtask count + deadline */}
      {hasFooter && (
        <>
          <div className="h-px bg-border-subtle w-full" />
          <div className="flex items-center gap-2">
            {total > 0 && (
              <div className="flex items-center gap-1">
                <SvgIcon name="list-check" size={14} className="text-fg-3 shrink-0" />
                <span className="text-[12px] text-fg-3 tracking-[-0.12px]">{done} / {total}</span>
              </div>
            )}
            {dateLabel && (
              <div className="flex items-center gap-1">
                <SvgIcon
                  name="calendar"
                  size={14}
                  className={cn('shrink-0', over ? 'text-orange-500' : 'text-fg-3')}
                />
                <span className={cn('text-[12px] tabular-nums tracking-[-0.12px]', over ? 'text-orange-500 font-medium' : 'text-fg-3')}>
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
