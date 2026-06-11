'use client'

import { useState } from 'react'
import { DrawerClose } from '@/components/ui/Drawer'
import {
  AppDrawer,
  AppDrawerHeader,
  AppDrawerMeta,
  AppDrawerBody,
  AppDrawerFooter,
} from '@/components/ui/AppDrawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DatePicker } from '@/components/ui/DatePicker'
import { PillSelect } from '@/components/ui/PillSelect'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { createProject } from '@/app/(app)/projecten/actions'
import type { ProjectStatus } from '@/types/project'
import { PROJECT_COLUMNS } from '@/types/project'

interface NieuwProjectDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  klanten?: Array<{ id: string; naam: string }>
}

export function NieuwProjectDrawer({ open, onOpenChange, klanten = [] }: NieuwProjectDrawerProps) {
  const [naam, setNaam]                 = useState('')
  const [samenvatting, setSamenvatting] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
  const [klantId, setKlantId]           = useState('')
  const kleur = '#5B5BD6'
  const [status, setStatus]             = useState<ProjectStatus>('bezig')
  const [deadline, setDeadline]         = useState('')
  const [budget, setBudget]             = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const statusCol = PROJECT_COLUMNS.find((c) => c.status === status)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!naam.trim()) { setError('Vul een projectnaam in.'); return }
    setLoading(true)
    setError(null)

    const fd = new FormData()
    fd.set('naam', naam.trim())
    fd.set('beschrijving', (samenvatting.trim() + (beschrijving.trim() ? '\n\n' + beschrijving.trim() : '')).trim())
    if (klantId)  fd.set('klant_id', klantId)
    fd.set('kleur', kleur)
    if (deadline) fd.set('deadline', deadline)
    if (budget)   fd.set('budget', budget)
    fd.set('status', status)

    const result = await createProject(null, fd)
    setLoading(false)
    if (result.error) setError(result.error)
    else onOpenChange(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit(e)
  }

  return (
    <AppDrawer open={open} onOpenChange={onOpenChange} title="Nieuw project aanmaken" width={620}>
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        data-vaul-no-drag
        className="flex h-full flex-col"
      >
        <AppDrawerHeader>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div
              className="size-4 rounded-sm flex items-center justify-center text-white text-[9px] font-bold shrink-0"
              style={{ backgroundColor: kleur }}
            >
              P
            </div>
            <span className="text-sm font-medium text-foreground">Nieuw project</span>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon-sm" type="button" className="text-muted-foreground" aria-label="Sluiten">
              <SvgIcon name="x" size={14} />
            </Button>
          </DrawerClose>
        </AppDrawerHeader>

        <AppDrawerMeta>
          {/* Status */}
          <PillSelect
            value={status}
            onChange={(v) => setStatus(v as ProjectStatus)}
            icon={statusCol?.iconName ?? 'circle-dashed'}
          >
            {PROJECT_COLUMNS.map((col) => (
              <option key={col.status} value={col.status}>{col.label}</option>
            ))}
          </PillSelect>

          {/* Klant */}
          {klanten.length > 0 && (
            <PillSelect value={klantId} onChange={setKlantId} icon="users">
              <option value="">Geen klant</option>
              {klanten.map((k) => (
                <option key={k.id} value={k.id}>{k.naam}</option>
              ))}
            </PillSelect>
          )}

          {/* Deadline */}
          <DatePicker
            variant="pill"
            value={deadline}
            onChange={setDeadline}
            placeholder="Deadline"
            aria-label="Deadline"
          />

          {/* Budget */}
          <div className="relative inline-flex items-center">
            <span className="pointer-events-none absolute left-2.5 text-[11px] text-muted-foreground">€</span>
            <Input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Budget"
              min="0"
              aria-label="Projectbudget in euro"
              className="h-7 w-[110px] rounded-full border-border bg-secondary pl-6 pr-3 text-xs"
            />
          </div>
        </AppDrawerMeta>

        <AppDrawerBody>
          {/* Naam */}
          <input
            type="text"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="Projectnaam"
            aria-label="Projectnaam"
            autoFocus
            className="bg-transparent outline-none text-[22px] font-semibold text-fg-1 placeholder:text-fg-disabled w-full shrink-0"
          />

          {/* Samenvatting */}
          <input
            type="text"
            value={samenvatting}
            onChange={(e) => setSamenvatting(e.target.value)}
            placeholder="Voeg een korte samenvatting toe..."
            aria-label="Korte samenvatting"
            className="bg-transparent outline-none text-[14px] text-fg-2 placeholder:text-fg-3 w-full -mt-2 shrink-0"
          />

          {/* Beschrijving */}
          <textarea
            value={beschrijving}
            onChange={(e) => setBeschrijving(e.target.value)}
            placeholder="Schrijf een projectomschrijving, brief, of verzamel ideeën..."
            aria-label="Projectomschrijving"
            className="flex-1 min-h-[160px] bg-transparent outline-none resize-none text-[13px] text-fg-1 placeholder:text-fg-3 w-full"
          />

          {error && <p className="text-xs text-destructive shrink-0">{error}</p>}
        </AppDrawerBody>

        <AppDrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" size="sm" type="button">Annuleren</Button>
          </DrawerClose>
          <Button type="submit" size="sm" disabled={loading || !naam.trim()} className="gap-1.5">
            <SvgIcon name="save" size={13} />
            {loading ? 'Aanmaken...' : 'Project aanmaken'}
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
