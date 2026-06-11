'use client'

import { useState } from 'react'
import { DrawerClose } from '@/components/ui/Drawer'
import {
  AppDrawer,
  AppDrawerHeader,
  AppDrawerBody,
  AppDrawerFooter,
} from '@/components/ui/AppDrawer'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { createLead } from '@/app/(app)/leads/actions'
import type { Lead } from '@/types/lead'
import { LeadFormFields } from './LeadFormFields'

interface NieuweLeadDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (lead: Lead) => void
}

export function NieuweLeadDrawer({ open, onOpenChange, onCreated }: NieuweLeadDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await createLead(null, new FormData(e.currentTarget))
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      if (result.lead) onCreated?.(result.lead)
      onOpenChange(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') e.currentTarget.requestSubmit()
  }

  return (
    <AppDrawer open={open} onOpenChange={onOpenChange} title="Nieuwe lead" width={480}>
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        data-vaul-no-drag
        className="flex h-full flex-col"
      >
        <AppDrawerHeader>
          <div className="flex items-center gap-2 text-muted-foreground">
            <SvgIcon name="user-plus" size={14} />
            <span className="text-sm font-medium text-foreground">Nieuwe lead</span>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon-sm" type="button" className="text-muted-foreground" aria-label="Sluiten">
              <SvgIcon name="x" size={14} />
            </Button>
          </DrawerClose>
        </AppDrawerHeader>

        <AppDrawerBody className="gap-4">
          <LeadFormFields idPrefix="nieuw-lead-" />
          {error && <p className="text-xs text-destructive shrink-0">{error}</p>}
        </AppDrawerBody>

        <AppDrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" size="sm" type="button">Annuleren</Button>
          </DrawerClose>
          <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
            <SvgIcon name="save" size={13} />
            {loading ? 'Aanmaken...' : 'Lead aanmaken'}
            <span className="flex items-center gap-0.5 ml-1 opacity-50">
              <kbd className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-sm bg-primary-foreground/10">⌘</kbd>
              <kbd className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-sm bg-primary-foreground/10">↵</kbd>
            </span>
          </Button>
        </AppDrawerFooter>
      </form>
    </AppDrawer>
  )
}
