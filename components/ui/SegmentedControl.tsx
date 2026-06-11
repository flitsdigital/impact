'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'

export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
  icon?: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={cn('flex items-center p-0.5 rounded-full bg-bg-0', className)}>
      {options.map((opt) => (
        <Button
          key={opt.value}
          variant="ghost"
          size="xs"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={cn('rounded-full gap-1.5', value === opt.value && 'bg-secondary text-foreground')}
        >
          {opt.icon && <SvgIcon name={opt.icon} size={13} className="shrink-0" />}
          {opt.label}
        </Button>
      ))}
    </div>
  )
}
