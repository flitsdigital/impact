'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/Checkbox'
import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/Table'
import { cn } from '@/lib/utils'
import { PageHeader, PageToolbar } from '@/components/layout/PageHeader'
import { KlantToevoegenModal } from './KlantToevoegenModal'
import type { Klant, KlantType, KlantStatus } from '@/types/klant'
import { SvgIcon } from '../ui/SvgIcon'

// ─── helpers ────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: KlantType }) {
  const map = {
    recurring: { icon: 'refresh', label: 'Recurring' },
    project: { icon: 'folder-open', label: 'Project' },
    'one-off': { icon: 'bolt', label: 'One-off' },
  }
  const { icon, label } = map[type]
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
      <SvgIcon name={icon} size={13} className="shrink-0" />
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: KlantStatus }) {
  if (status === 'actief') {
    return (
      <Badge className="bg-[#0f2e18] text-foreground border-transparent gap-1.5 pl-1.5 pr-2 rounded-full hover:bg-[#0f2e18]">
        <SvgIcon name="badge-check" size={14} className="text-green-500" />
        Actief
      </Badge>
    )
  }
  if (status === 'gepauzeerd') {
    return (
      <Badge variant="secondary" className="gap-1.5 pl-1.5 pr-2 rounded-full">
        <SvgIcon name="circle-pause" size={14} />
        Gepauzeerd
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1.5 pl-1.5 pr-2 rounded-full">
      <SvgIcon name="archive" size={14} />
      Gearchiveerd
    </Badge>
  )
}

function formatDate(iso: string | null): { label: string; sub: string } | null {
  if (!iso) return null
  const date = new Date(iso)
  const now = new Date()
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const dayLabel = date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })

  if (diff < 0) return { label: `${Math.abs(diff)} dagen geleden`, sub: `(${dayLabel})` }
  if (diff === 0) return { label: 'Vandaag', sub: `(${dayLabel})` }
  if (diff <= 7) return { label: `Over ${diff} dag${diff === 1 ? '' : 'en'}`, sub: `(${dayLabel})` }
  if (diff <= 14) return { label: 'Over 1 week', sub: `(${dayLabel})` }
  if (diff <= 21) return { label: 'Over 2 weken', sub: `(${dayLabel})` }
  if (diff <= 28) return { label: 'Over 3 weken', sub: `(${dayLabel})` }
  return { label: `Over ${Math.ceil(diff / 7)} weken`, sub: `(${dayLabel})` }
}

// ─── types ───────────────────────────────────────────────────────────────────

type View = 'tabel' | 'lijst' | 'kanban'
type TypeFilter = 'all' | KlantType
type SortKey = 'naam' | 'type' | null
type SortDir = 'asc' | 'desc'

// ─── component ───────────────────────────────────────────────────────────────

export function KlantenTable({ klanten }: { klanten: Klant[] }) {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('tabel')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = klanten
    .filter((k) => {
      const matchSearch = k.naam.toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === 'all' || k.type === typeFilter
      return matchSearch && matchType
    })
    .sort((a, b) => {
      if (!sortKey) return 0
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((k) => k.id)))
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Klanten overzicht"
        iconName="users"
        actions={
          <>
            <div className="relative flex items-center">
              <SvgIcon name="magnifying-glass" size={13} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek een klant"
                className="h-[26px] pl-7 w-[220px] rounded-full bg-secondary border-transparent text-sm"
              />
            </div>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <SvgIcon name="user-plus" size={14} />
              Klant toevoegen
            </Button>
          </>
        }
        toolbar={
          <PageToolbar className="gap-1.5 py-2.5">
            <div className="flex items-center p-0.5 rounded-full bg-bg-0">
              {([
                { key: 'tabel', icon: 'table', label: 'Tabel' },
                { key: 'lijst', icon: 'list', label: 'Lijst' },
                { key: 'kanban', icon: 'layout-columns', label: 'Kanban' },
              ] as { key: View; icon: string; label: string }[]).map(({ key, icon, label }) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="xs"
                  onClick={() => setView(key)}
                  className={cn('rounded-full', view === key && 'bg-secondary text-foreground')}
                >
                  <SvgIcon name={icon} data-icon="inline-start" />
                  {label}
                </Button>
              ))}
            </div>

            {/* Type filter */}
            <div className="flex items-center p-0.5 rounded-full bg-bg-0">
              {([
                { key: 'all', label: 'Alle' },
                { key: 'recurring', label: 'Recurring' },
                { key: 'project', label: 'Project' },
                { key: 'one-off', label: 'One-off' },
              ] as { key: TypeFilter; label: string }[]).map(({ key, label }) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="xs"
                  onClick={() => setTypeFilter(key)}
                  className={cn('rounded-full', typeFilter === key && 'bg-secondary text-foreground')}
                >
                  {label}
                </Button>
              ))}
            </div>
          </PageToolbar>
        }
      />

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto min-h-0">
        <table
          className="w-full border-separate border-spacing-0 text-sm"
          style={{ minWidth: 860 }}
        >
          <TableHeader>
            <TableRow className="hover:bg-transparent border-0">
              {/* Frozen: checkbox */}
              <TableHead className="sticky left-0 z-20 bg-background pl-8 pr-4 w-[60px] border-b border-border">
                <Checkbox
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              {/* Frozen: naam */}
              <TableHead className="sticky left-[60px] z-20 bg-background pr-4 border-b border-border">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => toggleSort('naam')}
                  className="px-0 text-muted-foreground hover:text-foreground font-medium"
                >
                  Klantnaam
                  <SvgIcon name="arrows-sort" data-icon="inline-end" />
                </Button>
              </TableHead>
              {/* Scrollable */}
              <TableHead className="w-[160px] border-b border-border">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => toggleSort('type')}
                  className="px-0 text-muted-foreground hover:text-foreground font-medium"
                >
                  Type
                  <SvgIcon name="arrows-sort" data-icon="inline-end" />
                </Button>
              </TableHead>
              <TableHead className="w-[160px] border-b border-border font-medium text-muted-foreground">
                Contactpersoon
              </TableHead>
              <TableHead className="w-[160px] border-b border-border font-medium text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="w-[260px] pl-4 pr-8 border-b border-border font-medium text-muted-foreground">
                Volgende factuur
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length === 0 && (
              <TableRow className="hover:bg-transparent border-0">
                <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                  {search ? 'Geen klanten gevonden.' : 'Nog geen klanten toegevoegd.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((klant) => {
              const date = formatDate(klant.volgende_factuur)
              const isSelected = selected.has(klant.id)

              return (
                <TableRow
                  key={klant.id}
                  data-state={isSelected ? 'selected' : undefined}
                  className="border-0"
                >
                  {/* Frozen: checkbox */}
                  <TableCell className={cn(
                    'sticky left-0 z-10 pl-8 pr-4 border-b border-border transition-colors',
                    isSelected ? 'bg-muted' : 'bg-background'
                  )}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(klant.id)}
                    />
                  </TableCell>
                  {/* Frozen: naam */}
                  <TableCell className={cn(
                    'sticky left-[60px] z-10 pr-4 border-b border-border transition-colors',
                    isSelected ? 'bg-muted' : 'bg-background'
                  )}>
                    <Link
                      href={`/klanten/${klant.id}`}
                      className="text-sm font-medium text-foreground hover:underline"
                    >
                      {klant.naam}
                    </Link>
                  </TableCell>
                  {/* Type */}
                  <TableCell className="border-b border-border">
                    <TypeBadge type={klant.type} />
                  </TableCell>
                  {/* Contactpersoon */}
                  <TableCell className="border-b border-border text-muted-foreground">
                    {klant.contactpersoon ?? <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  {/* Status */}
                  <TableCell className="border-b border-border">
                    <StatusBadge status={klant.status} />
                  </TableCell>
                  {/* Volgende factuur */}
                  <TableCell className="pl-4 pr-8 border-b border-border">
                    {date ? (
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium">{date.label}</span>
                        <span className="text-muted-foreground">{date.sub}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </table>
      </div>

      <KlantToevoegenModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}
