'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface MobileListCardProps {
  /** Maakt de hele kaart tapbaar als link (detailpagina). Heeft voorrang op onClick. */
  href?: string
  /** Of als knop (bv. drawer openen). */
  onClick?: () => void
  selected?: boolean
  /** Links, buiten het tap-gebied — bv. een Checkbox. */
  leading?: ReactNode
  /** Rechts, buiten het tap-gebied — bv. een kebab-menu. */
  trailing?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Tap-bare kaart die op telefoon (`< md`) een tabelrij vervangt. Geeft de
 * consistente schil (tap-target, selectie-state, optionele checkbox/kebab); de
 * inhoud vult elke lijst zelf in. Zie de tabel-componenten voor gebruik.
 */
export function MobileListCard({
  href,
  onClick,
  selected,
  leading,
  trailing,
  children,
  className,
}: MobileListCardProps) {
  const tapClass = 'flex min-w-0 flex-1 flex-col gap-1 text-left transition-opacity active:opacity-60'

  return (
    <div
      data-selected={selected ? 'true' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 transition-colors',
        selected ? 'border-border-strong bg-bg-3' : 'border-border-subtle bg-bg-2',
        className,
      )}
    >
      {leading}
      {href ? (
        <Link href={href} className={cn(tapClass, 'no-underline')}>
          {children}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={tapClass}>
          {children}
        </button>
      )}
      {trailing}
    </div>
  )
}
