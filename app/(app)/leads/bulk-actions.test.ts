import { describe, it, expect, vi, beforeEach } from 'vitest'

// ponytail: alleen de guards + zod-validatie zijn echte logica. Supabase/auth/cache
// zijn plumbing → gemockt. We testen GEEN UI (selectie-state); dat is jsdom-theater.

const h = vi.hoisted(() => ({
  dbError: null as { message: string } | null,
  authThrows: false,
  last: {} as { table?: string; update?: unknown; deleted?: boolean; in?: { col: string; ids: unknown } },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  requireAuth: vi.fn(async () => { if (h.authThrows) throw new Error('unauth') }),
  createClient: vi.fn(async () => ({
    from: (table: string) => {
      h.last.table = table
      const _in = (col: string, ids: unknown) => { h.last.in = { col, ids }; return { error: h.dbError } }
      return {
        update: (patch: unknown) => { h.last.update = patch; return { in: _in } },
        delete: () => { h.last.deleted = true; return { in: _in } },
      }
    },
  })),
}))

import { bulkUpdateLeads, bulkDeleteLeads } from './actions'

beforeEach(() => {
  h.dbError = null
  h.authThrows = false
  h.last = {}
})

describe('bulkUpdateLeads', () => {
  it('weigert lege selectie zonder DB-call', async () => {
    expect(await bulkUpdateLeads([], { status: 'nieuw' })).toEqual({ error: 'Geen leads geselecteerd.' })
    expect(h.last.in).toBeUndefined()
  })

  it('auth-fout gaat vóór de selectie-check', async () => {
    h.authThrows = true
    expect(await bulkUpdateLeads([], { status: 'nieuw' })).toEqual({ error: 'Niet ingelogd.' })
  })

  it('weigert een ongeldige status-enum', async () => {
    const res = await bulkUpdateLeads(['1'], { status: 'zombie' })
    expect(res.error).toBeTruthy()
    expect(h.last.in).toBeUndefined() // geen DB-write op invalide input
  })

  it('één ongeldig veld verwerpt de hele patch', async () => {
    const res = await bulkUpdateLeads(['1'], { status: 'nieuw', bron: 'tiktok' })
    expect(res.error).toBeTruthy()
    expect(h.last.in).toBeUndefined()
  })

  it('leeg patch-object → niets om bij te werken', async () => {
    expect(await bulkUpdateLeads(['1'], {})).toEqual({ error: 'Niets om bij te werken.' })
    expect(h.last.in).toBeUndefined()
  })

  it('onbekende keys worden gestript en tellen niet als update', async () => {
    // edge: zonder .strict() laat zod onbekende keys vallen i.p.v. erop te falen
    const res = await bulkUpdateLeads(['1'], { foo: 'bar' } as { status?: string })
    expect(res).toEqual({ error: 'Niets om bij te werken.' })
    expect(h.last.update).toBeUndefined()
  })

  it('schrijft alleen gevalideerde velden naar de DB', async () => {
    const res = await bulkUpdateLeads(['a', 'b'], { status: 'gewonnen', extra: 'x' } as { status?: string })
    expect(res).toEqual({})
    expect(h.last.update).toEqual({ status: 'gewonnen' }) // 'extra' is weg
    expect(h.last.in).toEqual({ col: 'id', ids: ['a', 'b'] })
  })

  it('geeft DB-fout door', async () => {
    h.dbError = { message: 'boom' }
    expect(await bulkUpdateLeads(['1'], { status: 'contact' })).toEqual({ error: 'boom' })
  })
})

describe('bulkDeleteLeads', () => {
  it('weigert lege selectie zonder DB-call', async () => {
    expect(await bulkDeleteLeads([])).toEqual({ error: 'Geen leads geselecteerd.' })
    expect(h.last.deleted).toBeUndefined()
  })

  it('auth-fout gaat vóór de selectie-check', async () => {
    h.authThrows = true
    expect(await bulkDeleteLeads([])).toEqual({ error: 'Niet ingelogd.' })
  })

  it('verwijdert de geselecteerde ids', async () => {
    expect(await bulkDeleteLeads(['a', 'b'])).toEqual({})
    expect(h.last.deleted).toBe(true)
    expect(h.last.in).toEqual({ col: 'id', ids: ['a', 'b'] })
  })

  it('geeft DB-fout door', async () => {
    h.dbError = { message: 'fk_violation' }
    expect(await bulkDeleteLeads(['1'])).toEqual({ error: 'fk_violation' })
  })
})
