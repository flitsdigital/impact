'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DateShortcutsPicker } from '@/components/todos/DateShortcutsPicker'
import { PriorityFlags, PriorityGlyph } from '@/components/todos/PriorityFlags'
import { AssigneeDropdown } from '@/components/todos/AssigneeDropdown'
import type { TaskPriority } from '@/types/project'
import type { TodoWithAssignees, TeamMember } from '@/types/todo'

// Laat een textarea meegroeien met z'n inhoud.
const autoSize = (el: HTMLTextAreaElement | null) => {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

// Compacte prioriteit-kiezer: glyph-trigger opent een popover met de vier vlaggen.
function PriorityField({ value, onChange }: {
  value: TaskPriority
  onChange: (v: TaskPriority) => void
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label="Prioriteit" className={cn('inline-flex outline-none transition-opacity hover:opacity-100', value === 'normaal' && 'opacity-60')}>
        <PriorityGlyph p={value} size={16} />
      </PopoverTrigger>
      <PopoverContent align="end" className="pointer-events-auto w-auto p-1.5">
        <PriorityFlags value={value} onChange={(v) => { onChange(v); setOpen(false) }} />
      </PopoverContent>
    </Popover>
  )
}

export function TodoRow({
  todo, team, onToggle, onTitle, onDate, onPriority, onAssignToggle, onDelete,
}: {
  todo: TodoWithAssignees
  team: TeamMember[]
  onToggle: () => void
  onTitle: (v: string) => void
  onDate: (v: string) => void
  onPriority: (v: TodoWithAssignees['prioriteit']) => void
  onAssignToggle: (id: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const escaping = React.useRef(false)

  const save = (v: string) => {
    setEditing(false)
    const next = v.trim()
    if (next && next !== todo.titel) onTitle(next)
  }

  return (
    <div className="group flex items-start gap-2.5 py-2.5">
      <button
        type="button"
        onClick={onToggle}
        aria-label={todo.done ? 'Markeer als onvoltooid' : 'Markeer als voltooid'}
        className={cn(
          'mt-0.5 grid size-5 shrink-0 place-content-center rounded-full border transition-colors',
          todo.done ? 'border-green-500 bg-green-500/15 text-green-500' : 'border-border-strong text-transparent hover:border-fg-2',
        )}
      >
        <SvgIcon name="check" size={11} />
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <textarea
            ref={autoSize}
            autoFocus
            defaultValue={todo.titel}
            rows={1}
            onFocus={(e) => { e.currentTarget.select(); autoSize(e.currentTarget) }}
            onInput={(e) => autoSize(e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur() }
              if (e.key === 'Escape') { e.preventDefault(); escaping.current = true; e.currentTarget.blur() }
            }}
            onBlur={(e) => {
              if (escaping.current) { escaping.current = false; setEditing(false); return }
              save(e.currentTarget.value)
            }}
            className="block w-full resize-none overflow-hidden bg-transparent text-[13px] leading-snug text-fg-1 outline-none"
          />
        ) : (
          <p
            onDoubleClick={() => setEditing(true)}
            className={cn('text-[13px] leading-snug', todo.done ? 'text-fg-3 line-through' : 'text-fg-1')}
          >
            {todo.titel}
          </p>
        )}
        {todo.notitie && <p className="mt-0.5 text-[12px] leading-snug text-fg-2">{todo.notitie}</p>}

        {/* Meta — eigen regel onder de titel, altijd zichtbaar. */}
        <div className="mt-1.5 flex items-center gap-3">
          <DateShortcutsPicker compact value={todo.deadline ?? ''} onChange={onDate} />
          <PriorityField value={todo.prioriteit} onChange={onPriority} />
          <AssigneeDropdown compact value={todo.assignees.map((a) => a.profile_id)} team={team} onToggle={onAssignToggle} />
        </div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        aria-label="Taak verwijderen"
        className="mt-0.5 shrink-0 text-fg-3 opacity-0 transition-opacity hover:text-fg-1 group-hover:opacity-100"
      >
        <SvgIcon name="trash" size={16} />
      </button>
    </div>
  )
}
