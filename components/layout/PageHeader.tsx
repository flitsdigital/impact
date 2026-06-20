import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'

type PageHeaderProps = {
  title: string
  /** SvgIcon name from /public/icons */
  iconName?: string
  /** Custom icon element — takes precedence over iconName */
  icon?: ReactNode
  actions?: ReactNode
  toolbar?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  iconName,
  icon,
  actions,
  toolbar,
  className,
}: PageHeaderProps) {
  const iconEl =
    icon ??
    (iconName ? (
      <SvgIcon name={iconName} size={16} className="text-muted-foreground shrink-0" />
    ) : null)

  return (
    <div className={cn('border-b border-border shrink-0', className)}>
      {/* Telefoon: titel boven, acties op een eigen volle regel eronder. Desktop: naast elkaar. */}
      <div className="flex flex-col gap-2.5 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-2 md:pl-8 md:pr-3">
        <div className="flex items-center gap-2 min-w-0">
          {iconEl}
          <span className="text-sm font-medium text-foreground truncate">{title}</span>
        </div>
        {actions ? (
          <div className="flex items-center gap-2 md:shrink-0">{actions}</div>
        ) : null}
      </div>
      {toolbar}
    </div>
  )
}

export function PageToolbar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        // Telefoon: horizontaal scrollbaar (brede segmented-controls/filters blijven bereikbaar).
        'flex items-center gap-2 px-4 py-2 border-t border-border shrink-0 overflow-x-auto md:overflow-visible md:pl-8 md:pr-3',
        className,
      )}
    >
      {children}
    </div>
  )
}
