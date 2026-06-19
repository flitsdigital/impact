'use client'

import * as React from 'react'
import { VariantBar } from './shared'
import V1 from './gating/v1'
import V2 from './gating/v2'
import V3 from './gating/v3'
import V4 from './gating/v4'
import V5 from './gating/v5'
import V6 from './gating/v6'

const VARIANTS = [
  { value: 'v1', label: 'Verborgen in nav', Comp: V1 },
  { value: 'v2', label: 'Locked overlay', Comp: V2 },
  { value: 'v3', label: 'Read-only banner', Comp: V3 },
  { value: 'v4', label: 'Empty-state', Comp: V4 },
  { value: 'v5', label: 'Inline disabled + tooltip', Comp: V5 },
  { value: 'v6', label: 'Toegang-aanvraag flow', Comp: V6 },
]

export function Gating() {
  const [v, setV] = React.useState('v1')
  const Active = VARIANTS.find((x) => x.value === v)!.Comp
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex justify-center">
        <VariantBar value={v} onChange={setV} options={VARIANTS.map(({ value, label }) => ({ value, label }))} />
      </div>
      <div className="flex-1"><Active /></div>
    </div>
  )
}
