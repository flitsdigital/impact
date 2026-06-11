import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'

export interface AvatarStackPerson {
  key: string
  src?: string | null
  name?: string
}

interface AvatarStackProps {
  people: AvatarStackPerson[]
  /** Avatar-diameter in px */
  size?: number
  /** Maximaal aantal zichtbare avatars; de rest wordt een "+N"-bolletje */
  max?: number
  /** Overlap in px tussen opeenvolgende avatars */
  overlap?: number
  /** Ringkleur richting de achtergrond, bv. 'ring-bg-2' op kaarten */
  ringClass?: string
  /** Toon het "+N"-overloopbolletje (uit te zetten als de caller zelf telt) */
  showOverflow?: boolean
  className?: string
}

export function AvatarStack({
  people,
  size = 20,
  max = 3,
  overlap = 6,
  ringClass = 'ring-bg-2',
  showOverflow = true,
  className,
}: AvatarStackProps) {
  if (people.length === 0) return null

  return (
    <div className={cn('flex items-center shrink-0', className)}>
      {people.slice(0, max).map((p, i) => (
        <Avatar
          key={p.key}
          src={p.src}
          name={p.name}
          size={size}
          className={cn('ring-1', ringClass)}
          style={i > 0 ? { marginLeft: -overlap } : undefined}
        />
      ))}
      {showOverflow && people.length > max && (
        <span
          className={cn(
            'rounded-full bg-bg-3 flex items-center justify-center text-fg-3 ring-1',
            ringClass,
          )}
          style={{ width: size, height: size, marginLeft: -overlap, fontSize: Math.max(8, size * 0.45) }}
        >
          +{people.length - max}
        </span>
      )}
    </div>
  )
}
