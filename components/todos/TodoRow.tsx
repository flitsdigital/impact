'use client'

import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { DateShortcutsPicker } from '@/components/todos/DateShortcutsPicker'
import { PriorityFlags } from '@/components/todos/PriorityFlags'
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
  return (
    <div className="group flex items-start gap-3 py-3">
      <button type="button" onClick={onToggle}
        aria-label={todo.done ? 'Markeer als onvoltooid' : 'Markeer als voltooid'}
        className={cn('mt-0.5 grid size-[18px] shrink-0 place-content-center rounded-full border transition-colors',
          todo.done ? 'border-green-500 bg-green-500/15 text-green-500' : 'border-border-strong text-transparent hover:border-fg-2')}>
        <SvgIcon name="check" size={11} />
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn('text-[15px] leading-snug', todo.done ? 'text-fg-3 line-through' : 'text-fg-1')}>
          {todo.titel}
        </p>
        {todo.notitie && <p className="mt-0.5 text-[13px] leading-snug text-fg-2">{todo.notitie}</p>}

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <DateShortcutsPicker value={todo.deadline ?? ''} onChange={onDate} />
          <PriorityFlags value={todo.prioriteit} onChange={onPriority} />
          <AssigneeDropdown
            value={todo.assignees.map((a) => a.profile_id)}
            team={team}
            onToggle={onAssignToggle}
          />
          {todo.assignees.length > 0 && (
            <AvatarStack
              people={todo.assignees.map((a) => ({ key: a.profile_id, name: a.profiles.full_name ?? undefined, src: a.profiles.avatar_url }))}
              size={18} overlap={5} ringClass="ring-bg-1"
            />
          )}
        </div>
      </div>

      <button type="button" onClick={onDelete} aria-label="Taak verwijderen"
        className="mt-0.5 shrink-0 text-fg-3 opacity-0 transition-opacity hover:text-fg-1 group-hover:opacity-100">
        <SvgIcon name="trash" size={14} />
      </button>
    </div>
  )
}
