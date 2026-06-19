'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { EASE } from './shared'
import { Matrix } from './matrix'
import { Gebruiker } from './gebruiker'
import { Uitnodigen } from './uitnodigen'
import { Gating } from './gating'

// ponytail: één testpagina voor het granulaire-rechten ontwerp. 4 stappen, elk 6 varianten.
// Mockdata, geen backend. Per stap een winnaar kiezen → dán echt bouwen (role-kolom + RLS).

type Tab = 'matrix' | 'gebruiker' | 'uitnodigen' | 'gating'
const TABS: { id: Tab; label: string; icon: string; blurb: string }[] = [
  { id: 'matrix', label: '1 · Rolbeheer', icon: 'table', blurb: 'Bepaal wat elke rol per feature mag (Geen / Bekijken / Bewerken / Beheren).' },
  { id: 'gebruiker', label: '2 · Per gebruiker', icon: 'user', blurb: 'Rol toewijzen + per-gebruiker uitzonderingen op de rechten.' },
  { id: 'uitnodigen', label: '3 · Uitnodigen', icon: 'user-plus', blurb: 'Nodig uit per e-mail en kies meteen de rol/rechten.' },
  { id: 'gating', label: '4 · Gating', icon: 'triangle-exclamation', blurb: 'Wat een gebruiker zonder recht op een pagina te zien krijgt.' },
]

export default function RechtenPrototypePage() {
  const [tab, setTab] = React.useState<Tab>('matrix')
  const active = TABS.find((t) => t.id === tab)!
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border-subtle px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[14px] font-medium text-fg-1">Granulaire rechten — prototypes</h1>
            <p className="text-[12px] text-fg-3">{active.blurb}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-bg-0 p-1">
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
        {tab === 'matrix' && <Matrix />}
        {tab === 'gebruiker' && <Gebruiker />}
        {tab === 'uitnodigen' && <Uitnodigen />}
        {tab === 'gating' && <Gating />}
      </div>
    </div>
  )
}
