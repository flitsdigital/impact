import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'

/**
 * Icoon + label in de statuskleur. Werkt met elke status-config die
 * { iconName, label, textClass } levert (KANBAN_COLUMNS, PROJECT_COLUMNS,
 * content-STATUS_CONFIG, …). Tekstgrootte erft van `className`.
 */
interface StatusChipProps {
  iconName: string
  label: string
  /** Kleurklasse uit de status-config, bv. 'text-orange-500' */
  textClass?: string
  iconSize?: number
  /** Overschrijft de kleur van alleen het label (icoon houdt textClass) */
  labelClass?: string
  className?: string
}

export function StatusChip({
  iconName,
  label,
  textClass,
  iconSize = 12,
  labelClass,
  className,
}: StatusChipProps) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <SvgIcon name={iconName} size={iconSize} className={cn('shrink-0', textClass)} />
      <span className={labelClass ?? textClass}>{label}</span>
    </span>
  )
}
