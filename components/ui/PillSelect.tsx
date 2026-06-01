'use client'

import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'

interface PillSelectProps {
  name?: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  /** Optional leading icon name (from /public/icons). */
  icon?: string
  className?: string
}

/**
 * Native `<select>` styled as a rounded pill, with an optional leading icon and
 * a trailing caret. Used in the app's drawers (content + task) for compact,
 * inline metadata dropdowns. Because it's a native select, its open menu is
 * OS-rendered — which also means it works inside Drawers/Dialogs without the
 * pointer-events workaround that portaled popups need.
 */
export function PillSelect({ name, value, onChange, children, icon, className }: PillSelectProps) {
  return (
    <div className="relative inline-flex items-center">
      {icon && (
        <span className="pointer-events-none absolute left-2 flex items-center text-muted-foreground">
          <SvgIcon name={icon} size={12} />
        </span>
      )}
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-7 appearance-none rounded-full border border-border bg-secondary text-xs text-foreground outline-none cursor-pointer focus:border-ring pr-5',
          icon ? 'pl-6' : 'pl-3',
          className,
        )}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-2 text-muted-foreground">
        <SvgIcon name="caret-down" size={10} />
      </span>
    </div>
  )
}
