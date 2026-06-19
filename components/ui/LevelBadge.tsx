import { cn } from "@/lib/utils"
import { SvgIcon } from "@/components/ui/SvgIcon"
import { levelMeta, type Level } from "@/lib/permissions"

/**
 * Toegangsniveau als getinte pill (Geen / Bekijken / Bewerken / Beheren).
 * Pure weergave; voeding via het rechten-model in `lib/permissions`.
 */
export function LevelBadge({ level, withIcon = true, className }: { level: Level; withIcon?: boolean; className?: string }) {
  const m = levelMeta(level)
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]", m.bg, m.tint, className)}>
      {withIcon && <SvgIcon name={m.icon} size={11} />}
      {m.short}
    </span>
  )
}
