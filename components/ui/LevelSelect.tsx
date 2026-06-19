"use client"

import { cn } from "@/lib/utils"
import { SvgIcon } from "@/components/ui/SvgIcon"
import { LEVELS, type Level } from "@/lib/permissions"

/**
 * 4-weg toegangsniveau-kiezer (Geen / Bekijken / Bewerken / Beheren).
 * Zelfde segmented-look als SegmentedControl, maar met niveau-tints per optie.
 */
export function LevelSelect({
  value,
  onChange,
  showLabels = false,
  disabled = false,
  className,
}: {
  value: Level
  onChange: (level: Level) => void
  showLabels?: boolean
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-lg bg-bg-0 p-0.5", disabled && "opacity-50", className)}>
      {LEVELS.map((l) => (
        <button
          key={l.value}
          type="button"
          disabled={disabled}
          title={`${l.label} — ${l.desc}`}
          aria-pressed={value === l.value}
          onClick={() => onChange(l.value)}
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1 text-[12px] transition-colors ease-strong duration-200",
            disabled ? "cursor-not-allowed" : "cursor-pointer",
            value === l.value ? cn("bg-secondary", l.tint) : "text-fg-3 hover:text-fg-1",
          )}
        >
          <SvgIcon name={l.icon} size={12} />
          {showLabels && <span>{l.short}</span>}
        </button>
      ))}
    </div>
  )
}
