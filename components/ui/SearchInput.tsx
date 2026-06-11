'use client'

import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Toegankelijke naam; valt terug op de placeholder */
  ariaLabel?: string
  autoFocus?: boolean
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Zoeken...',
  ariaLabel,
  autoFocus,
  className,
}: SearchInputProps) {
  return (
    <div className={cn('flex items-center gap-1.5 bg-bg-3 rounded-full px-3 h-7 w-[220px]', className)}>
      <SvgIcon name="magnifying-glass" size={13} className="text-fg-3 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        autoFocus={autoFocus}
        className="bg-transparent text-[12px] text-fg-1 placeholder:text-fg-3 outline-none flex-1 min-w-0"
      />
    </div>
  )
}
