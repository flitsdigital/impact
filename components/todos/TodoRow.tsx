'use client'

import { cn } from '@/lib/utils'
import { fmtDate } from '@/lib/dates'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { DateShortcutsPicker } from '@/components/todos/DateShortcutsPicker'
import { PriorityFlags, PriorityGlyph } from '@/components/todos/PriorityFlags'
import { AssigneeDropdown } from '@/components/todos/AssigneeDropdown'
import type { TodoWithAssignees, TeamMember } from '@/types/todo'

export function TodoRow({
  todo, team, onToggle, onDate, onPriority, onAssignToggle, onDelete,
}: {
  todo: TodoWithAssignees
  team: TeamMember[]
  onToggle: () => void
  onDate: (v: string) => void
  onPriority: (v: TodoWithAssignees['prioriteit']) => void
  onAssignToggle: (id: string) => void
  onDelete: () => void
}) {
  const hasMeta = todo.deadline || todo.prioriteit !== 'normaal' || todo.assignees.length > 0

  return (
    <div className="group flex items-start gap-2.5 py-2">
      <button
        type="button"
        onClick={onToggle}
        aria-label={todo.done ? 'Markeer als onvoltooid' : 'Markeer als voltooid'}
        className={cn(
          'mt-0.5 grid size-4 shrink-0 place-content-center rounded-full border transition-colors',
          todo.done ? 'border-green-500 bg-green-500/15 text-green-500' : 'border-border-strong text-transparent hover:border-fg-2',
        )}
      >
        <SvgIcon name="check" size={9} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn('flex-1 truncate text-[13px] leading-snug', todo.done ? 'text-fg-3 line-through' : 'text-fg-1')}>
            {todo.titel}
          </p>

          {/* Read-only meta — compact; verbergt zodra je over de rij hovert (dan komen de editors). */}
          {hasMeta && (
            <div className="flex shrink-0 items-center gap-2.5 text-fg-3 group-hover:hidden">
              {todo.deadline && (
                <span className="inline-flex items-center gap-1 text-[11px]">
                  <SvgIcon name="calendar" size={11} />
                  {fmtDate(todo.deadline, { day: 'numeric', month: 'short' })}
                </span>
              )}
              {todo.prioriteit !== 'normaal' && <PriorityGlyph p={todo.prioriteit} size={12} />}
              {todo.assignees.length > 0 && (
                <AvatarStack
                  people={todo.assignees.map((a) => ({ key: a.profile_id, name: a.profiles.full_name ?? undefined, src: a.profiles.avatar_url }))}
                  size={16}
                  overlap={4}
                  ringClass="ring-bg-1"
                />
              )}
            </div>
          )}
        </div>

        {todo.notitie && <p className="mt-0.5 truncate text-[12px] leading-snug text-fg-2">{todo.notitie}</p>}

        {/* Editors — alleen zichtbaar bij hover, zodat de rij in rust compact blijft. */}
        <div className="mt-1.5 hidden flex-wrap items-center gap-1.5 group-hover:flex">
          <DateShortcutsPicker value={todo.deadline ?? ''} onChange={onDate} />
          <PriorityFlags value={todo.prioriteit} onChange={onPriority} />
          <AssigneeDropdown value={todo.assignees.map((a) => a.profile_id)} team={team} onToggle={onAssignToggle} />
        </div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        aria-label="Taak verwijderen"
        className="mt-0.5 shrink-0 text-fg-3 opacity-0 transition-opacity hover:text-fg-1 group-hover:opacity-100"
      >
        <SvgIcon name="trash" size={14} />
      </button>
    </div>
  )
}
