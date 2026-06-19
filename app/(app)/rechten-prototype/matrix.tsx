'use client'

import * as React from 'react'
import { VariantBar } from './shared'
import V1 from './matrix/v1'
import V2 from './matrix/v2'
import V3 from './matrix/v3'
import V4 from './matrix/v4'
import V5 from './matrix/v5'
import V6 from './matrix/v6'

const VARIANTS = [
  { value: 'v1', label: 'Volledige matrix', Comp: V1 },
  { value: 'v2', label: 'Rol-detail', Comp: V2 },
  { value: 'v3', label: 'Accordion per groep', Comp: V3 },
  { value: 'v4', label: 'Presets + diff', Comp: V4 },
  { value: 'v5', label: 'Rol-kaarten + sliders', Comp: V5 },
  { value: 'v6', label: 'Regel-builder', Comp: V6 },
]

export function Matrix() {
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
