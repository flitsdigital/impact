'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { createProject } from '@/app/(app)/projecten/actions'
import { X, ChevronRight, Calendar, User } from 'lucide-react'
import type { ProjectStatus } from '@/types/project'

const STATUS_OPTIONS: { value: ProjectStatus; label: string; dot: string }[] = [
  { value: 'gepland',      label: 'Gepland',      dot: '#FFB223' },
  { value: 'bezig',        label: 'Bezig',        dot: '#46A557' },
  { value: 'feedback',     label: 'Feedback',     dot: '#0072F5' },
  { value: 'klaar',        label: 'Klaar',        dot: '#5B5BD6' },
  { value: 'gearchiveerd', label: 'Gearchiveerd', dot: '#716C6C' },
]

interface NieuwProjectDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  klanten?: Array<{ id: string; naam: string }>
}

export function NieuwProjectDrawer({ open, onOpenChange, klanten = [] }: NieuwProjectDrawerProps) {
  const [naam, setNaam]               = useState('')
  const [samenvatting, setSamenvatting] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
  const [klantId, setKlantId]         = useState('')
  const kleur = '#5B5BD6'
  const [status, setStatus]           = useState<ProjectStatus>('bezig')
  const [deadline, setDeadline]       = useState('')
  const [budget, setBudget]           = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [openChip, setOpenChip]       = useState<string | null>(null)

  async function handleSubmit() {
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

  const selectedStatus = STATUS_OPTIONS.find((s) => s.value === status)!
  const selectedKlant  = klanten.find((k) => k.id === klantId)

  function toggleChip(chip: string, e: React.MouseEvent) {
    e.stopPropagation()
    setOpenChip((prev) => (prev === chip ? null : chip))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[720px] w-full p-0 gap-0 bg-bg-1 border border-border-subtle"
        onClick={() => setOpenChip(null)}
      >
        <DialogTitle className="sr-only">Nieuw project aanmaken</DialogTitle>
        {/* ── Breadcrumb header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-1.5 text-[12px] text-fg-3">
            <div
              className="size-4 rounded-sm flex items-center justify-center text-white text-[9px] font-bold shrink-0"
              style={{ backgroundColor: kleur }}
            >
              P
            </div>
            <span>Projecten</span>
            <ChevronRight size={10} className="text-fg-disabled" />
            <span className="text-fg-2">Nieuw project</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 rounded text-fg-3 hover:text-fg-1 hover:bg-bg-4 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ── */}
        <div
          className="px-6 py-5 flex flex-col gap-4 overflow-y-auto max-h-[65vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Project icon */}
          <div
            className="size-10 rounded-xl flex items-center justify-center self-start shrink-0"
            style={{ backgroundColor: kleur + '22' }}
          >
            <div className="size-4 rounded-full" style={{ backgroundColor: kleur }} />
          </div>

          {/* Naam */}
          <input
            type="text"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="Projectnaam"
            aria-label="Projectnaam"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            className="bg-transparent outline-none text-[22px] font-semibold text-fg-1 placeholder:text-fg-disabled w-full"
          />

          {/* Samenvatting */}
          <input
            type="text"
            value={samenvatting}
            onChange={(e) => setSamenvatting(e.target.value)}
            placeholder="Voeg een korte samenvatting toe..."
            aria-label="Korte samenvatting"
            className="bg-transparent outline-none text-[14px] text-fg-2 placeholder:text-fg-3 w-full -mt-2"
          />

          {/* ── Chip row ── */}
          <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>

            {/* Status */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => toggleChip('status', e)}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] border transition-colors',
                  openChip === 'status'
                    ? 'bg-bg-3 border-border text-fg-1'
                    : 'bg-bg-0 border-border-subtle text-fg-2 hover:border-border hover:text-fg-1',
                )}
              >
                <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: selectedStatus.dot }} />
                {selectedStatus.label}
              </button>
              {openChip === 'status' && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-bg-2 border border-border-subtle rounded-lg shadow-lg py-1 min-w-[160px]">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setStatus(opt.value); setOpenChip(null) }}
                      className={cn(
                        'w-full text-left flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-bg-3 transition-colors',
                        status === opt.value ? 'text-fg-1 font-medium' : 'text-fg-2',
                      )}
                    >
                      <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: opt.dot }} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Klant */}
            {klanten.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => toggleChip('klant', e)}
                  className={cn(
                    'flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] border transition-colors',
                    openChip === 'klant'
                      ? 'bg-bg-3 border-border text-fg-1'
                      : 'bg-bg-0 border-border-subtle text-fg-2 hover:border-border hover:text-fg-1',
                  )}
                >
                  <User size={11} />
                  {selectedKlant?.naam ?? 'Klant'}
                </button>
                {openChip === 'klant' && (
                  <div className="absolute top-full left-0 mt-1 z-20 bg-bg-2 border border-border-subtle rounded-lg shadow-lg py-1 min-w-[180px]">
                    <button
                      type="button"
                      onClick={() => { setKlantId(''); setOpenChip(null) }}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-[12px] hover:bg-bg-3 transition-colors',
                        !klantId ? 'text-fg-1 font-medium' : 'text-fg-2',
                      )}
                    >
                      Geen klant
                    </button>
                    {klanten.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => { setKlantId(k.id); setOpenChip(null) }}
                        className={cn(
                          'w-full text-left px-3 py-1.5 text-[12px] hover:bg-bg-3 transition-colors',
                          klantId === k.id ? 'text-fg-1 font-medium' : 'text-fg-2',
                        )}
                      >
                        {k.naam}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Deadline */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => toggleChip('deadline', e)}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] border transition-colors',
                  openChip === 'deadline'
                    ? 'bg-bg-3 border-border text-fg-1'
                    : deadline
                    ? 'bg-bg-0 border-border-subtle text-fg-1 hover:border-border'
                    : 'bg-bg-0 border-border-subtle text-fg-2 hover:border-border hover:text-fg-1',
                )}
              >
                <Calendar size={11} />
                {deadline
                  ? new Date(deadline + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
                  : 'Deadline'}
              </button>
              {openChip === 'deadline' && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-bg-2 border border-border-subtle rounded-lg shadow-lg p-3">
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => { setDeadline(e.target.value); setOpenChip(null) }}
                    aria-label="Projectdeadline"
                    autoFocus
                    className="bg-bg-3 border border-border-subtle rounded px-2 py-1.5 text-[12px] text-fg-1 outline-none"
                  />
                  {deadline && (
                    <button
                      type="button"
                      onClick={() => { setDeadline(''); setOpenChip(null) }}
                      className="mt-2 w-full text-[11px] text-fg-3 hover:text-fg-2 text-center"
                    >
                      Wis deadline
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Budget */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => toggleChip('budget', e)}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] border transition-colors',
                  openChip === 'budget'
                    ? 'bg-bg-3 border-border text-fg-1'
                    : budget
                    ? 'bg-bg-0 border-border-subtle text-fg-1 hover:border-border'
                    : 'bg-bg-0 border-border-subtle text-fg-2 hover:border-border hover:text-fg-1',
                )}
              >
                <span className="text-[11px] font-medium">€</span>
                {budget ? `€ ${Number(budget).toLocaleString('nl-NL')}` : 'Budget'}
              </button>
              {openChip === 'budget' && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-bg-2 border border-border-subtle rounded-lg shadow-lg p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-fg-3">€</span>
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setOpenChip(null) }}
                      placeholder="0"
                      min="0"
                      aria-label="Projectbudget in euro"
                      autoFocus
                      className="bg-bg-3 border border-border-subtle rounded px-2 py-1.5 text-[12px] text-fg-1 outline-none w-[100px]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Beschrijving */}
          <textarea
            value={beschrijving}
            onChange={(e) => setBeschrijving(e.target.value)}
            rows={5}
            placeholder="Schrijf een projectomschrijving, brief, of verzamel ideeën..."
            aria-label="Projectomschrijving"
            className="bg-transparent outline-none resize-none text-[13px] text-fg-1 placeholder:text-fg-3 w-full"
          />

          {error && (
            <p className="text-[12px] text-orange-400 bg-orange-400/10 rounded px-3 py-2">{error}</p>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-subtle shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Annuleer
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !naam.trim()}>
            {loading ? 'Aanmaken...' : 'Project aanmaken'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
