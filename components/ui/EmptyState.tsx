import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'

interface EmptyStateProps {
  /** SvgIcon-naam uit /public/icons */
  icon?: string
  title: string
  description?: string
  /** Optionele CTA, bv. een "Nieuw project"-knop */
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center h-full gap-3 text-center', className)}>
      {icon && <SvgIcon name={icon} size={32} className="text-fg-disabled" />}
      <div className="flex flex-col gap-1">
        <span className="text-[14px] font-medium text-fg-2">{title}</span>
        {description && <span className="text-[12px] text-fg-3">{description}</span>}
      </div>
      {action}
    </div>
  )
}
