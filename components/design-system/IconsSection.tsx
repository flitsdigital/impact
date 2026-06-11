import { SvgIcon, ICON_NAMES, PLACEHOLDER_ICON_NAMES } from '@/components/ui/SvgIcon'
import { SectionHeading } from './DemoBlock'

export function IconsSection() {
  const placeholderCount = PLACEHOLDER_ICON_NAMES.length

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        id="iconen"
        title="Iconen"
        intro={`SvgIcon rendert /public/icons/{naam}.svg als CSS-mask, dus iconen erven de tekstkleur (text-fg-3 etc.). Onbekende namen tonen een rode stip; ${placeholderCount} namen zijn nog rode placeholders die op een custom ontwerp wachten.`}
      />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
        {ICON_NAMES.map((name) => (
          <div
            key={name}
            className="flex flex-col items-center gap-2 rounded-lg border border-border-subtle bg-bg-1 px-2 py-3"
          >
            <SvgIcon name={name} size={18} className="text-fg-2" />
            <code className="text-[10px] font-mono text-fg-3 truncate max-w-full">{name}</code>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-fg-3">
        Gebruik: <code className="font-mono">{'<SvgIcon name="chart-kanban" size={13} className="text-fg-3" />'}</code>
      </p>
    </section>
  )
}
