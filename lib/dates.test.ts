import { describe, it, expect } from 'vitest'
import { addDays, toLocalDateStr, endOfMonth, toPct, fmtDate, isOverdue, parseDate } from '@/lib/dates'

describe('addDays', () => {
  it('happy path: +5 days', () => {
    expect(addDays('2026-06-10', 5)).toBe('2026-06-15')
  })

  it('month boundary: Jan 31 + 1', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
  })

  it('year boundary: Dec 31 + 1', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
  })

  it('leap day: Feb 28 2024 + 1', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
  })

  it('negative offset: Mar 1 - 1', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('DST regression: spring-forward day + 1 (Europe/Amsterdam 2026-03-29)', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
  })

  it('DST regression: spring-forward day + 2 (Europe/Amsterdam 2026-03-30)', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
  })

  it('DST regression: fall-back day + 2 (Europe/Amsterdam 2026-10-26)', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
  })
})

describe('toLocalDateStr', () => {
  it('formats a local Date to YYYY-MM-DD', () => {
    expect(toLocalDateStr(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('endOfMonth', () => {
  it('returns last day of February 2026 (non-leap)', () => {
    const result = endOfMonth(new Date(2026, 1, 10))
    expect(result.getDate()).toBe(28)
    expect(result.getMonth()).toBe(1)
  })
})

describe('parseDate', () => {
  it('keeps the calendar date for date-only strings (noon anchor)', () => {
    const d = parseDate('2026-06-10')
    expect(d.getDate()).toBe(10)
    expect(d.getHours()).toBe(12)
  })

  it('parses full ISO timestamps as-is', () => {
    expect(parseDate('2026-06-10T08:30:00Z').toISOString()).toBe('2026-06-10T08:30:00.000Z')
  })
})

describe('fmtDate', () => {
  it('formats date-only strings as short Dutch date', () => {
    expect(fmtDate('2026-06-10')).toBe('10 jun')
  })

  it('accepts Intl options for longer formats', () => {
    expect(fmtDate('2026-06-10', { day: 'numeric', month: 'short', year: 'numeric' })).toBe('10 jun 2026')
  })
})

describe('isOverdue', () => {
  it('yesterday is overdue', () => {
    expect(isOverdue(addDays(toLocalDateStr(new Date()), -1))).toBe(true)
  })

  it('today is not overdue', () => {
    expect(isOverdue(toLocalDateStr(new Date()))).toBe(false)
  })

  it('tomorrow is not overdue', () => {
    expect(isOverdue(addDays(toLocalDateStr(new Date()), 1))).toBe(false)
  })
})

describe('toPct', () => {
  it('mid-month is 50% of a 30-day range (characterizes UTC parse behavior)', () => {
    const result = toPct('2026-01-16', new Date('2026-01-01'), 30 * 86_400_000)
    expect(result).toBe(50)
  })
})
