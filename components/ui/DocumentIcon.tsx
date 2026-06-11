'use client'

import { useState } from 'react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { cn } from '@/lib/utils'

interface DocumentIconProps {
  type: 'link' | 'file'
  url:  string
  size?: number
  className?: string
}

// Officiële Google-producticoontjes (stabiele gstatic-branding-assets).
const G = (name: string) =>
  `https://www.gstatic.com/images/branding/product/2x/${name}_2020q4_48dp.png`

/**
 * Bepaalt het juiste icoon-URL voor een link. Voor bekende Google-producten
 * (Docs, Sheets, Slides, Forms, Drive) het specifieke producticoon op basis van
 * het URL-pad; voor alle overige links de favicon van het domein.
 */
function iconUrlFor(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const { hostname, pathname } = parsed

  if (hostname === 'docs.google.com') {
    if (pathname.startsWith('/document'))     return G('docs')
    if (pathname.startsWith('/spreadsheets')) return G('sheets')
    if (pathname.startsWith('/presentation')) return G('slides')
    if (pathname.startsWith('/forms'))        return G('forms')
  }
  if (hostname === 'drive.google.com')  return G('drive')
  if (hostname === 'sheets.google.com') return G('sheets')
  if (hostname === 'slides.google.com') return G('slides')
  if (hostname === 'forms.google.com')  return G('forms')

  // Fallback: favicon van het domein.
  return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
}

/**
 * Toont voor links het passende icoon (Google Docs/Drive/etc. of de favicon van
 * het domein), met fallback naar het generieke link-icoon. Voor bestanden het
 * PDF-icoon.
 */
export function DocumentIcon({ type, url, size = 13, className }: DocumentIconProps) {
  const [failed, setFailed] = useState(false)

  if (type === 'file') {
    return <SvgIcon name="file-text" size={size} className={cn('text-fg-3 shrink-0', className)} />
  }

  const iconUrl = failed ? null : iconUrlFor(url)
  if (!iconUrl) {
    return <SvgIcon name="link" size={size} className={cn('text-fg-3 shrink-0', className)} />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconUrl}
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0 rounded-[2px] object-contain', className)}
      onError={() => setFailed(true)}
    />
  )
}
