/**
 * Huisstijl-euroweergave: hele bedragen als "€ 1.250,-",
 * bedragen met centen als "€ 1.250,50". Non-breaking space na het
 * €-teken zodat bedrag en teken nooit over twee regels breken.
 */
export function formatEur(n: number): string {
  if (Number.isInteger(n)) {
    return '€ ' + n.toLocaleString('nl-NL') + ',-'
  }
  return '€ ' + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
