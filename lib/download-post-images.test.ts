import { describe, it, expect } from 'vitest'
import { mediaFileName, zipFileName } from './download-post-images'

describe('mediaFileName', () => {
  const url = 'https://x.supabase.co/storage/v1/object/public/post-media/123-abc.jpg'

  it('formats date, zero-padded sequence, klant and extension', () => {
    expect(mediaFileName({ date: '2026-06-15', index: 0, klant: 'M. Peters Montage', url }))
      .toBe('2026-06-15 01 M. Peters Montage.jpg')
  })

  it('counts from 1 and pads to two digits', () => {
    expect(mediaFileName({ date: '2026-06-15', index: 9, klant: 'X', url }))
      .toBe('2026-06-15 10 X.jpg')
  })

  it('falls back to Onbekend when klant is missing', () => {
    expect(mediaFileName({ date: '2026-06-15', index: 0, klant: null, url }))
      .toBe('2026-06-15 01 Onbekend.jpg')
  })

  it('keeps the real extension and ignores query strings', () => {
    expect(mediaFileName({ date: '2026-06-15', index: 0, klant: 'X', url: 'https://x/y/a.png?token=1' }))
      .toBe('2026-06-15 01 X.png')
  })

  it('strips path separators from klant', () => {
    expect(mediaFileName({ date: '2026-06-15', index: 0, klant: 'A/B', url }))
      .toBe('2026-06-15 01 A-B.jpg')
  })
})

describe('zipFileName', () => {
  it('combines date and klant', () => {
    expect(zipFileName('2026-06-15', 'M. Peters Montage')).toBe('2026-06-15 M. Peters Montage.zip')
  })
})
