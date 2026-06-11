'use client'

import { useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerTitle,
} from '@/components/ui/Drawer'
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-[420px] max-w-[95vw] sm:max-w-[420px] border-l border-border-subtle bg-bg-1">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
          <DrawerTitle className="text-[15px] font-medium text-fg-1">Nieuwe lead</DrawerTitle>
          <DrawerClose asChild data-vaul-no-drag>
            <Button variant="ghost" size="icon-sm" aria-label="Sluiten">
              <SvgIcon name="x" size={16} />
            </Button>
          </DrawerClose>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto flex-1">
            <LeadFormFields idPrefix="nieuw-lead-" />
            {error && (
              <p className="text-[12px] text-orange-400 bg-orange-400/10 rounded px-3 py-2">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-subtle shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              data-vaul-no-drag
            >
              Annuleer
            </Button>
            <Button type="submit" disabled={loading} data-vaul-no-drag>
              {loading ? 'Aanmaken...' : 'Lead aanmaken'}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
