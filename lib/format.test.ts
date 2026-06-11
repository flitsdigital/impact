import { describe, it, expect } from 'vitest'
import { formatEur } from '@/lib/format'

describe('formatEur', () => {
  it('whole amounts get the ",-" suffix', () => {
    expect(formatEur(1250)).toBe('€ 1.250,-')
  })

  it('zero is a whole amount', () => {
    expect(formatEur(0)).toBe('€ 0,-')
  })

  it('amounts with cents show two decimals', () => {
    expect(formatEur(1250.5)).toBe('€ 1.250,50')
  })
})
