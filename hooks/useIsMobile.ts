'use client'

import { useEffect, useState } from 'react'

// Telefoon = < md (768px). Eén bron voor de JS-kant van het responsive-contract
// (zie docs/DESIGN-SYSTEM.md §3a); CSS gebruikt gewoon de `md:`-prefix.
const QUERY = '(max-width: 767px)'

/** SSR-veilig: server + eerste paint geven `false`, daarna de echte waarde. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  return isMobile
}
