'use client'

import type { ReactNode } from 'react'
import { Button } from './Button'
import { SvgIcon } from './SvgIcon'
import { cn } from '@/lib/utils'

interface SelectionBarProps {
  count: number
  onClear: () => void
  /** Acties die in de balk komen (knoppen, dropdown-triggers). */
  children?: ReactNode
  /** Woord achter de teller, bv. "geselecteerd". */
  label?: string
  className?: string
}

/**
 * Zwevende actiebalk onderaan het scherm; verschijnt zodra er iets geselecteerd
 * is. Toont de teller + een wis-knop, met de acties als children ertussen.
 */
export function SelectionBar({ count, onClear, children, label = 'geselecteerd', className }: SelectionBarProps) {
  if (count === 0) return null
  return (
    <div
      className={cn(
        // Op telefoon boven de bottom tab bar zweven (incl. safe-area); op desktop onderaan.
        'fixed bottom-[calc(env(safe-area-inset-bottom)+64px)] md:bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-xl border border-border-strong bg-bg-1 p-1.5 pl-3 shadow-lg',
        'max-w-[calc(100vw-1.5rem)] overflow-x-auto',
        'duration-200 ease-strong animate-in fade-in slide-in-from-bottom-4',
        className,
      )}
    >
      <span className="text-[13px] font-medium text-fg-1 tabular-nums">{count}</span>
      {/* Label kost te veel breedte op telefoon; geselecteerde items zijn al gemarkeerd. */}
      <span className="hidden text-[13px] text-fg-3 sm:inline">{label}</span>
      <div className="mx-1.5 h-5 w-px bg-border-subtle" />
      {children}
      <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Selectie wissen">
        <SvgIcon name="x" size={15} />
      </Button>
    </div>
  )
}
