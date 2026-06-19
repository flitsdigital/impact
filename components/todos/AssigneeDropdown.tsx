'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { TeamMember } from '@/types/todo'

const PILL =
  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-xs text-secondary-foreground outline-none transition-colors hover:bg-bg-3'

// Base-ui Popover (niet Radix DropdownMenu): positioneert correct binnen een
// vaul-Drawer, waar Radix' fixed-popup naar linksboven (0,0) klapt. Multi-select:
// een klik togglet en de popover blijft open.
export function AssigneeDropdown({
  value, team, onToggle, ringClass = 'ring-secondary', onOpenChange, compact = false,
}: {
  value: string[]
  team: TeamMember[]
  onToggle: (id: string) => void
  ringClass?: string
  /** Meldt open/dicht terug zodat de caller (TodoRow) z'n rij open kan houden. */
  onOpenChange?: (open: boolean) => void
  /** Compacte, stijl-loze trigger voor in rijen: icoon als leeg, avatars als gevuld. */
  compact?: boolean
}) {
  const [open, setOpenRaw] = React.useState(false)
  const setOpen = (o: boolean) => { setOpenRaw(o); onOpenChange?.(o) }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={compact
          ? cn('inline-flex items-center whitespace-nowrap outline-none transition-colors hover:text-fg-1', value.length === 0 && 'text-fg-3/60')
          : cn(PILL, value.length === 0 && 'text-fg-3')}
        data-vaul-no-drag
      >
        {value.length > 0 ? (
          <AvatarStack
            people={value.map((id) => ({
              key: id,
              name: team.find((t) => t.id === id)?.full_name ?? undefined,
              src: team.find((t) => t.id === id)?.avatar_url,
            }))}
            size={compact ? 20 : 16} overlap={compact ? 6 : 5} ringClass={compact ? 'ring-bg-1' : ringClass}
          />
        ) : (
          <SvgIcon name="user-plus" size={compact ? 16 : 12} />
        )}
        {!compact && (value.length > 0 ? `${value.length} toegewezen` : 'Toewijzen')}
      </PopoverTrigger>

      <PopoverContent align={compact ? 'end' : 'start'} className="pointer-events-auto w-56 gap-0 p-1">
        {team.map((t) => {
          const on = value.includes(t.id)
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onToggle(t.id)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[13px] text-fg-1 transition-colors hover:bg-bg-3"
            >
              <span className="flex items-center gap-2">
                <Avatar src={t.avatar_url} name={t.full_name ?? undefined} size={20} />
                {t.full_name ?? 'Onbekend'}
              </span>
              {on && <SvgIcon name="check" size={14} className="text-fg-2" />}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
