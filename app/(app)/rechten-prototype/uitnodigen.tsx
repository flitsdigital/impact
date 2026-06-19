'use client'

import * as React from 'react'
import { VariantBar } from './shared'
import V1 from './uitnodigen/v1'
import V2 from './uitnodigen/v2'
import V3 from './uitnodigen/v3'
import V4 from './uitnodigen/v4'
import V5 from './uitnodigen/v5'
import V6 from './uitnodigen/v6'

const VARIANTS = [
  { value: 'v1', label: 'E-mail + live preview', Comp: V1 },
  { value: 'v2', label: 'Invite-wizard', Comp: V2 },
  { value: 'v3', label: 'Rol-template kaarten', Comp: V3 },
  { value: 'v4', label: 'Bulk met rol-kolom', Comp: V4 },
  { value: 'v5', label: 'Inline klap-uit rechten', Comp: V5 },
  { value: 'v6', label: 'Kopieer van collega', Comp: V6 },
]

export function Uitnodigen() {
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
