import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Wrapper voor één component-demo op de design-system pagina:
 * naam + importpad + korte beschrijving, met daaronder de live demo.
 */
interface DemoBlockProps {
  title: string
  /** Importpad, bv. "@/components/ui/Button" */
  path: string
  description?: string
  children: ReactNode
  className?: string
}

export function DemoBlock({ title, path, description, children, className }: DemoBlockProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[14px] font-medium text-fg-1">{title}</h3>
          <code className="text-[11px] font-mono text-fg-3">{path}</code>
        </div>
        {description && <p className="text-[12px] text-fg-3 max-w-2xl">{description}</p>}
      </div>
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-bg-1 p-4',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** Sectiekop met anker zodat de in-page navigatie ernaartoe kan springen. */
export function SectionHeading({ id, title, intro }: { id: string; title: string; intro?: string }) {
  return (
    <div id={id} className="flex flex-col gap-1 scroll-mt-20 pt-4 border-t border-border-subtle first:border-t-0 first:pt-0">
      <h2 className="text-[20px] font-semibold text-fg-1">{title}</h2>
      {intro && <p className="text-[13px] text-fg-3 max-w-3xl">{intro}</p>}
    </div>
  )
}
