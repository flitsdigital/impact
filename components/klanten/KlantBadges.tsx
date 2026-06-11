import { Badge } from '@/components/ui/Badge'
import { SvgIcon } from '@/components/ui/SvgIcon'
import type { KlantType, KlantStatus } from '@/types/klant'

const TYPE_CONFIG: Record<KlantType, { icon: string; label: string }> = {
  recurring: { icon: 'refresh', label: 'Recurring' },
  project: { icon: 'folder-open', label: 'Project' },
  'one-off': { icon: 'bolt', label: 'One-off' },
}

export function TypeBadge({ type }: { type: KlantType }) {
  const { icon, label } = TYPE_CONFIG[type]
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
      <SvgIcon name={icon} size={13} className="shrink-0" />
      {label}
    </span>
  )
}

export function StatusBadge({ status }: { status: KlantStatus }) {
  if (status === 'actief') {
    return (
      <Badge className="bg-[#0f2e18] text-foreground border-transparent gap-1.5 pl-1.5 pr-2 rounded-full hover:bg-[#0f2e18]">
        <SvgIcon name="badge-check" size={14} className="text-green-500" />
        Actief
      </Badge>
    )
  }
  if (status === 'gepauzeerd') {
    return (
      <Badge variant="secondary" className="gap-1.5 pl-1.5 pr-2 rounded-full">
        <SvgIcon name="circle-pause" size={14} />
        Gepauzeerd
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1.5 pl-1.5 pr-2 rounded-full">
      <SvgIcon name="archive" size={14} />
      Gearchiveerd
    </Badge>
  )
}
