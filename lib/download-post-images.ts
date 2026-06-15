// Pure naamgeving voor de zip-download (gebruikt door de server-route + tests).

// Bestandsnaam per afbeelding: "2026-06-15 01 M. Peters Montage.jpg"
//   date  = postdatum (YYYY-MM-DD)
//   index = volgorde, 1-based, 2 cijfers
//   klant = klantnaam (val terug op "Onbekend")
export function mediaFileName(opts: {
  date: string
  index: number
  klant: string | null | undefined
  url: string
}): string {
  const seq = String(opts.index + 1).padStart(2, '0')
  const klant = (opts.klant?.trim() || 'Onbekend').replace(/[/\\]/g, '-')
  const ext = opts.url.split('?')[0].split('.').pop() || 'jpg'
  return `${opts.date} ${seq} ${klant}.${ext}`
}

export function zipFileName(date: string, klant: string | null | undefined): string {
  return `${date} ${(klant?.trim() || 'Onbekend').replace(/[/\\]/g, '-')}.zip`
}
