import { cn } from '@/lib/utils'

// Every filename (without .svg) that exists in /public/icons
const AVAILABLE = new Set([
  'arrows-sort', 'bolt', 'calendar', 'caret-down', 'chart-gantt', 'chart-kanban',
  'check', 'chevron-left', 'chevron-right', 'chevrons-left',
  'circle', 'circle-check', 'circle-check-stroke', 'circle-dashed', 'circle-notch',
  'coin-vertical', 'ellipsis', 'file-invoice-dollar', 'filter', 'grid-2',
  'image-square', 'inbox', 'layout-columns', 'layout-grid', 'layout-rows',
  'layers', 'list-check', 'list-check-1', 'magnifying-glass', 'plus',
  'road', 'scrubber', 'signal-bars', 'text-size', 'text-size-1',
  'triangle-exclamation', 'user-clock', 'user-plus', 'user-plus-1', 'users',
  'video',
])

interface SvgIconProps {
  name: string
  size?: number
  className?: string
}

/**
 * Renders an SVG icon from /public/icons/{name}.svg as a CSS mask so it
 * inherits `color` (Tailwind text-* classes apply). Unknown names render a
 * red 16 px circle placeholder so missing icons are immediately visible.
 */
export function SvgIcon({ name, size = 16, className }: SvgIconProps) {
  if (!AVAILABLE.has(name)) {
    return (
      <span
        className={cn('inline-block shrink-0 rounded-full bg-red-500', className)}
        style={{ width: size, height: size, verticalAlign: 'middle' }}
        title={`Missing icon: ${name}`}
      />
    )
  }

  return (
    <span
      className={cn('inline-block shrink-0', className)}
      style={{
        width: size,
        height: size,
        verticalAlign: 'middle',
        WebkitMaskImage: `url(/icons/${name}.svg)`,
        maskImage: `url(/icons/${name}.svg)`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        backgroundColor: 'currentColor',
      } as React.CSSProperties}
    />
  )
}
