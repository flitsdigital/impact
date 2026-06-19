'use client'

import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'

interface PillSelectProps {
  name?: string
  /** Controlled value. Omit (with `defaultValue`) for uncontrolled FormData use. */
  value?: string
  /** Uncontrolled initial value — voor name-based formulieren. */
  defaultValue?: string
  onChange?: (v: string) => void
  children: React.ReactNode
  /** Optional leading icon name (from /public/icons). */
  icon?: string
  /** `pill` (compact, inline) of `input` (volle breedte, als het Input-atoom). */
  variant?: 'pill' | 'input'
  id?: string
  className?: string
}

/**
 * Native `<select>` met twee looks: `pill` (compact, inline — content/taak-drawers)
 * en `input` (volle breedte, identiek aan het `Input`-atoom — verticale formulieren).
 * Omdat het een native select is, wordt het open-menu door de OS gerenderd; daardoor
 * werkt het betrouwbaar binnen Drawers/Dialogs zonder de portal-/focus-problemen van
 * base-ui `Select`.
 */
export function PillSelect({
  name, value, defaultValue, onChange, children, icon, variant = 'pill', id, className,
}: PillSelectProps) {
  const isInput = variant === 'input'

  return (
    <div className={cn('relative flex items-center', isInput ? 'w-full' : 'inline-flex')}>
      {icon && (
        <span className="pointer-events-none absolute left-2.5 flex items-center text-muted-foreground">
          <SvgIcon name={icon} size={isInput ? 14 : 12} />
        </span>
      )}
      <select
        id={id}
        name={name}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          'appearance-none border bg-transparent text-foreground outline-none cursor-pointer transition-colors',
          isInput
            ? 'h-8 w-full min-w-0 rounded-lg border-input py-1 pr-8 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30'
            : 'h-7 rounded-full border-border bg-secondary pr-5 text-xs focus:border-ring',
          icon ? (isInput ? 'pl-8' : 'pl-6') : (isInput ? 'pl-2.5' : 'pl-3'),
          className,
        )}
      >
        {children}
      </select>
      <span className={cn('pointer-events-none absolute text-muted-foreground', isInput ? 'right-2.5' : 'right-2')}>
        <SvgIcon name="caret-down" size={isInput ? 12 : 10} />
      </span>
    </div>
  )
}
