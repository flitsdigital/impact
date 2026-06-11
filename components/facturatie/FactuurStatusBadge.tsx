import { FACTUUR_STATUS_CONFIG } from '@/types/factuur'

export function FactuurStatusBadge({ status }: { status: keyof typeof FACTUUR_STATUS_CONFIG }) {
  const cfg = FACTUUR_STATUS_CONFIG[status]
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${cfg.color}22`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}
