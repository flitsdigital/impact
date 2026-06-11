'use client'

import { PageHeader } from '@/components/layout/PageHeader'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { TokensSection } from './TokensSection'
import { IconsSection } from './IconsSection'
import { AtomsSection } from './AtomsSection'
import { OverlaysSection } from './OverlaysSection'
import { DomainSection } from './DomainSection'

const NAV = [
  { href: '#tokens', label: 'Tokens' },
  { href: '#iconen', label: 'Iconen' },
  { href: '#atomen', label: 'Atomen' },
  { href: '#overlays', label: 'Overlays' },
  { href: '#domein', label: 'Domein' },
]

/**
 * Levende styleguide op /design-system (alleen via URL bereikbaar).
 *
 * ⚠ Onderhoudsregel: elk nieuw gedeeld component krijgt hier een DemoBlock
 *   én een vermelding in docs/DESIGN-SYSTEM.md. Zie ook AGENTS.md.
 */
export function DesignSystemModule() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Design system"
        icon={<SvgIcon name="layout-grid" size={16} className="text-fg-1 shrink-0" />}
        actions={
          <code className="text-[11px] font-mono text-fg-3">docs/DESIGN-SYSTEM.md</code>
        }
        toolbar={
          <div className="flex items-center gap-1 pl-8 pr-3 py-2 border-t border-border shrink-0">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-2.5 py-1 rounded-full text-[12px] font-medium text-fg-3 hover:text-fg-1 hover:bg-bg-3 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8 flex flex-col gap-12">
          <p className="text-[13px] text-fg-2 max-w-3xl -mb-4">
            Levende styleguide van Flits CRM. Volledige documentatie (props, conventies,
            onderhoudsregels) staat in <code className="font-mono text-fg-1">docs/DESIGN-SYSTEM.md</code>.
            Nieuw component gemaakt? Voeg hier een demo toe en documenteer hem in de md.
          </p>
          <TokensSection />
          <IconsSection />
          <AtomsSection />
          <OverlaysSection />
          <DomainSection />
        </div>
      </div>
    </div>
  )
}
