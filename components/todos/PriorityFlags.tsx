'use client'

import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { PRIORITY_CONFIG, PRIORITY_ICON, type TaskPriority } from '@/types/project'

const PRIOS: TaskPriority[] = ['laag', 'normaal', 'hoog', 'urgent']

export function PriorityGlyph({ p, size = 13 }: { p: TaskPriority; size?: number }) {
  return (
    <span className="inline-flex" style={{ color: PRIORITY_CONFIG[p].color }}>
      <SvgIcon name={PRIORITY_ICON[p]} size={size} />
    </span>
  )
}

export function PriorityFlags({ value, onChange }: { value: TaskPriority; onChange: (v: TaskPriority) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary p-0.5">
      {PRIOS.map((p) => {
        const active = value === p
        return (
          <button key={p} onClick={() => onChange(p)} aria-label={PRIORITY_CONFIG[p].label}
            title={PRIORITY_CONFIG[p].label} aria-pressed={active}
            className={cn('grid size-6 place-content-center rounded-full transition-colors',
              active ? '' : 'opacity-40 hover:opacity-100')}
            style={active ? { background: PRIORITY_CONFIG[p].bg } : undefined}>
            <PriorityGlyph p={p} size={14} />
          </button>
        )
      })}
    </div>
  )
}
