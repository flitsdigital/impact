import { describe, it, expect } from 'vitest'
import { norm, scoreMatch, rankMatches } from './match'

describe('norm', () => {
  it('lowercases, trims and strips accents', () => {
    expect(norm('  Café André ')).toBe('cafe andre')
  })
})

describe('scoreMatch', () => {
  it('scores exact > startsWith > includes > token-overlap > none', () => {
    expect(scoreMatch('hout', 'hout')).toBe(1)
    expect(scoreMatch('hout', 'Hout BV')).toBe(0.9)
    expect(scoreMatch('hout', 'Jan Hout Montage')).toBe(0.7)
    expect(scoreMatch('jan hout', 'hout bv')).toBeCloseTo(0.3) // 1/2 tokens * 0.6
    expect(scoreMatch('xyz', 'Hout BV')).toBe(0)
  })
})

describe('rankMatches', () => {
  const leads = [
    { id: '1', naam: 'Hout BV' },
    { id: '2', naam: 'Houtwerk Peters' },
    { id: '3', naam: 'Bakkerij Jansen' },
  ]

  it('returns best matches above threshold, sorted', () => {
    const out = rankMatches('hout', leads, (l) => l.naam)
    expect(out.map((l) => l.id)).toEqual(['1', '2'])
  })

  it('returns empty when nothing matches', () => {
    expect(rankMatches('zzz', leads, (l) => l.naam)).toEqual([])
  })

  it('respects the limit', () => {
    expect(rankMatches('hout', leads, (l) => l.naam, { limit: 1 })).toHaveLength(1)
  })
})
