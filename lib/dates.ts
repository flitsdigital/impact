export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)   // local midnight — DST-safe
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function toPct(dateStr: string, rangeStart: Date, totalMs: number): number {
  return ((new Date(dateStr).getTime() - rangeStart.getTime()) / totalMs) * 100
}

/**
 * Parse a date string safely: date-only strings ("2026-06-10") get a noon
 * time so the calendar date never shifts, in any timezone. Full ISO
 * timestamps parse as-is.
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr)
}

export function fmtDate(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  return parseDate(dateStr).toLocaleDateString('nl-NL', opts ?? { day: 'numeric', month: 'short' })
}

export function fmtDateTime(dateStr: string): string {
  return parseDate(dateStr).toLocaleString('nl-NL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// "14 dagen geleden", "2 maanden geleden", … via de native Intl-API.
const RELATIVE_NL = new Intl.RelativeTimeFormat('nl-NL', { numeric: 'auto' })
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600], ['month', 30 * 24 * 3600], ['week', 7 * 24 * 3600],
  ['day', 24 * 3600], ['hour', 3600], ['minute', 60],
]
export function fmtRelative(dateStr: string): string {
  const diffSec = (parseDate(dateStr).getTime() - Date.now()) / 1000
  for (const [unit, sec] of RELATIVE_UNITS) {
    if (Math.abs(diffSec) >= sec) return RELATIVE_NL.format(Math.round(diffSec / sec), unit)
  }
  return RELATIVE_NL.format(Math.round(diffSec / 60), 'minute')
}

export function isOverdue(dateStr: string): boolean {
  return new Date(dateStr.slice(0, 10) + 'T23:59:59') < new Date()
}

export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
