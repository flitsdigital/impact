'use client'

import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarStack } from '@/components/ui/AvatarStack'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/DropdownMenu'
import type { TeamMember } from '@/types/todo'

const PILL =
  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-xs text-secondary-foreground outline-none transition-colors hover:bg-bg-3'

export function AssigneeDropdown({
  value, team, onToggle, ringClass = 'ring-secondary',
}: {
  value: string[]
  team: TeamMember[]
  onToggle: (id: string) => void
  ringClass?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(PILL, value.length === 0 && 'text-fg-3')}>
        {value.length > 0 ? (
          <AvatarStack
            people={value.map((id) => ({ key: id, name: team.find((t) => t.id === id)?.full_name ?? undefined, src: team.find((t) => t.id === id)?.avatar_url }))}
            size={16} overlap={5} ringClass={ringClass}
          />
        ) : (
          <SvgIcon name="user-plus" size={12} />
        )}
        {value.length > 0 ? `${value.length} toegewezen` : 'Toewijzen'}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        {team.map((t) => {
          const on = value.includes(t.id)
          return (
            <DropdownMenuItem key={t.id} onSelect={(e) => { e.preventDefault(); onToggle(t.id) }} className="justify-between">
              <span className="flex items-center gap-2">
                <Avatar src={t.avatar_url} name={t.full_name ?? undefined} size={20} />
                {t.full_name ?? 'Onbekend'}
              </span>
              {on && <SvgIcon name="check" size={14} className="text-fg-2" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
