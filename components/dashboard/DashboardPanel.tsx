import Link from 'next/link'
import { SvgIcon } from '@/components/ui/SvgIcon'

// Gedeelde paneel-shell voor de dashboard-kolommen (server + client).

export function Panel({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col rounded-[10px] bg-bg-0 overflow-hidden">{children}</div>
}

export function PanelHeader({ icon, title, count, link }: {
  icon: string
  title: string
  count?: number
  link?: { href: string; label: string }
}) {
  return (
    <div className="flex items-center justify-between gap-2 h-[50px] px-4 border-b border-border-subtle shrink-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <SvgIcon name={icon} size={16} className="text-fg-2 shrink-0" />
        <span className="text-[14px] font-medium text-fg-2 tracking-[-0.14px] truncate">{title}</span>
      </div>
      {count != null && (
        <span className="flex items-center justify-center size-[18px] rounded-[2px] bg-bg-3 text-[10px] font-semibold text-fg-2 tabular-nums shrink-0">
          {count}
        </span>
      )}
      {link && (
        <Link href={link.href} className="flex items-center gap-1 text-[10px] font-medium text-fg-2 hover:text-fg-1 shrink-0 transition-colors">
          {link.label}
          <SvgIcon name="chevron-right" size={12} />
        </Link>
      )}
    </div>
  )
}

export function PanelEmpty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <SvgIcon name={icon} size={20} className="text-fg-disabled" />
      <span className="text-[12px] text-fg-3">{text}</span>
    </div>
  )
}
