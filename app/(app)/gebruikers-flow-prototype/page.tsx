'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { EASE } from './shared'
import { Versturen } from './versturen'
import { Onboarding } from './onboarding'
import { Beheer } from './beheer'

// ponytail: één testpagina voor de complete uitnodig-flow. Drie tabs, elk met eigen variant-switcher.
// Mockdata, geen backend. Per onderdeel een winnaar kiezen → dán echt bouwen (incl. role-migratie + RLS).

type Tab = 'versturen' | 'onboarding' | 'beheer'
const TABS: { id: Tab; label: string; icon: string; blurb: string }[] = [
  { id: 'versturen', label: '1 · Versturen', icon: 'user-plus', blurb: 'Beheerder nodigt uit → Supabase stuurt de invite-mail.' },
  { id: 'onboarding', label: '2 · Onboarding', icon: 'smile', blurb: 'Uitgenodigde klikt de link → wachtwoord → profiel → binnen.' },
  { id: 'beheer', label: '3 · Beheer', icon: 'users', blurb: 'Overzicht, rollen wijzigen, opnieuw uitnodigen, deactiveren.' },
]

export default function GebruikersFlowPrototypePage() {
  const [tab, setTab] = React.useState<Tab>('versturen')
  const active = TABS.find((t) => t.id === tab)!
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border-subtle px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[14px] font-medium text-fg-1">Uitnodig-flow — prototypes</h1>
            <p className="text-[12px] text-fg-3">{active.blurb}</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-bg-0 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] transition-colors', EASE, tab === t.id ? 'bg-secondary text-fg-1' : 'text-fg-2 hover:text-fg-1')}
              >
                <SvgIcon name={t.icon} size={14} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
        {tab === 'versturen' && <Versturen />}
        {tab === 'onboarding' && <Onboarding />}
        {tab === 'beheer' && <Beheer />}
      </div>
    </div>
  )
}
