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
  // Toegevoegd bij de Lucide → custom-icon migratie (placeholders, vervang vrij)
  'archive', 'arrow-left', 'badge-check', 'check-square', 'chevron-down',
  'chevron-up', 'chevrons-right', 'circle-pause', 'clock', 'corner-down-right',
  'external-link', 'file-plus', 'file-text', 'folder-open', 'link',
  'list', 'log-out', 'map', 'message-square', 'pencil',
  'refresh', 'save', 'settings', 'smile', 'star',
  'table', 'trash', 'upload', 'user', 'x',
])

/**
 * Tijdelijke placeholder-iconen: deze bestaan wel in /public/icons maar zijn
 * nog NIET vervangen door een eigen custom ontwerp. Ze worden geforceerd ROOD
 * gerenderd zodat in één oogopslag zichtbaar is wat nog vervangen moet worden.
 *
 * → Heb je een eigen SVG geüpload? Haal de naam dan uit deze set, dan krijgt
 *   het icoon weer zijn normale (currentColor) kleur.
 */
const PLACEHOLDER = new Set([
  'archive', 'arrow-left', 'badge-check', 'check-square', 'chevron-down',
  'chevron-up', 'chevrons-right', 'circle-pause', 'clock', 'corner-down-right',
  'external-link', 'file-plus', 'file-text', 'folder-open', 'link',
  'list', 'log-out', 'map', 'message-square', 'pencil',
  'refresh', 'save', 'settings', 'smile', 'star',
  'table', 'trash', 'upload', 'user', 'x',
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
 * Names listed in PLACEHOLDER still render their shape, but are forced red
 * until a real custom icon is supplied.
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

  const isPlaceholder = PLACEHOLDER.has(name)

  return (
    <span
      className={cn('inline-block shrink-0', className)}
      title={isPlaceholder ? `Placeholder icon: ${name} (nog te vervangen)` : undefined}
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
        // Placeholders worden geforceerd rood; echte iconen erven currentColor.
        backgroundColor: isPlaceholder ? '#ef4444' : 'currentColor',
      } as React.CSSProperties}
    />
  )
}
