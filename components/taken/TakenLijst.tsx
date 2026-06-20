'use client'

import { StatusChip } from '@/components/ui/StatusChip'
import { EmptyState } from '@/components/ui/EmptyState'
import { MobileListCard } from '@/components/ui/MobileListCard'
import type { TaskWithRelations } from '@/types/project'
import { PRIORITY_CONFIG, KANBAN_COLUMNS } from '@/types/project'
import { fmtDate } from '@/lib/dates'

interface TakenLijstProps {
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
  /** Toon de projectkolom — alleen zinvol in cross-project-weergaven */
  showProject?: boolean
}

export function TakenLijst({ tasks, onTaskClick, showProject = false }: TakenLijstProps) {
  if (tasks.length === 0) {
    return <EmptyState icon="list-check" title="Geen taken gevonden." />
  }

  return (
    <>
      {/* ── Kaarten (telefoon) ───────────────────────────────────────────── */}
      <div className="md:hidden overflow-y-auto h-full flex flex-col gap-2 p-3">
        {tasks.map((task) => {
          const prio   = PRIORITY_CONFIG[task.prioriteit]
          const status = KANBAN_COLUMNS.find((c) => c.status === task.status)
          return (
            <MobileListCard key={task.id} onClick={() => onTaskClick(task)}>
              <span className="flex items-center gap-2">
                <span className="shrink-0 text-[11px] font-mono text-fg-3">FLT-{task.task_number}</span>
                <span className="truncate text-[13px] text-fg-1">{task.titel}</span>
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                {status && (
                  <StatusChip
                    iconName={status.iconName}
                    label={status.label}
                    textClass={status.textClass}
                    className="text-[11px]"
                  />
                )}
                {task.prioriteit !== 'normaal' && (
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ color: prio.color, background: prio.bg }}
                  >
                    {prio.label}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2 text-[12px] text-fg-2">
                {showProject && task.project && (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: task.project.kleur }} />
                    <span className="truncate">{task.project.naam}</span>
                  </span>
                )}
                {task.deadline && <span className="shrink-0 tabular-nums">· {fmtDate(task.deadline)}</span>}
              </span>
            </MobileListCard>
          )
        })}
      </div>

      {/* ── Table (tablet/desktop) ──────────────────────────────────────── */}
      <div className="hidden md:block overflow-y-auto h-full px-6 py-4">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-border-subtle">
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-20">ID</th>
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide">Titel</th>
            {showProject && (
              <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-36">Project</th>
            )}
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-24">Status</th>
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-24">Prioriteit</th>
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-24">Deadline</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const prio   = PRIORITY_CONFIG[task.prioriteit]
            const status = KANBAN_COLUMNS.find((c) => c.status === task.status)
            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="border-b border-border-subtle/50 hover:bg-bg-2 cursor-pointer transition-colors"
              >
                <td className="py-2.5 pr-3 text-[11px] font-mono text-fg-3">FLT-{task.task_number}</td>
                <td className="py-2.5 pr-3 text-[13px] text-fg-1 max-w-[280px] truncate">{task.titel}</td>
                {showProject && (
                  <td className="py-2.5 pr-3">
                    {task.project && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: task.project.kleur }} />
                        <span className="text-[12px] text-fg-2 truncate">{task.project.naam}</span>
                      </div>
                    )}
                  </td>
                )}
                <td className="py-2.5 pr-3">
                  {status && (
                    <StatusChip
                      iconName={status.iconName}
                      label={status.label}
                      textClass={status.textClass}
                      className="text-[11px]"
                    />
                  )}
                </td>
                <td className="py-2.5 pr-3">
                  {task.prioriteit !== 'normaal' && (
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ color: prio.color, background: prio.bg }}
                    >
                      {prio.label}
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-[12px] text-fg-2">
                  {task.deadline ? fmtDate(task.deadline) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </>
  )
}
