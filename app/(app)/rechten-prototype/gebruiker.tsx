'use client'

import * as React from 'react'
import { VariantBar } from './shared'
import V1 from './gebruiker/v1'
import V2 from './gebruiker/v2'
import V3 from './gebruiker/v3'
import V4 from './gebruiker/v4'
import V5 from './gebruiker/v5'
import V6 from './gebruiker/v6'

const VARIANTS = [
  { value: 'v1', label: 'Rol + uitzonderingen', Comp: V1 },
  { value: 'v2', label: 'Effectieve-rechten tabel', Comp: V2 },
  { value: 'v3', label: 'Twee-koloms transfer', Comp: V3 },
  { value: 'v4', label: 'Mini-matrix rij', Comp: V4 },
  { value: 'v5', label: 'Vergelijk met rol', Comp: V5 },
  { value: 'v6', label: 'Feature-kaarten + zoek', Comp: V6 },
]

export function Gebruiker() {
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
