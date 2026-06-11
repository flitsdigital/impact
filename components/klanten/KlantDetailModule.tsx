'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { updateKlant } from '@/app/(app)/klanten/actions'
import type { Klant, KlantType, KlantStatus } from '@/types/klant'
import type { KlantFactuur } from '@/types/factuur'
import { FACTUUR_STATUS_CONFIG } from '@/types/factuur'
import type { KlantProject } from '@/app/(app)/klanten/[id]/page'
import { PROJECT_COLUMNS } from '@/types/project'

// ─── Chips (copied from KlantenTable.tsx) ────────────────────────────────────

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

// ─── Project status chip ──────────────────────────────────────────────────────

function ProjectStatusBadge({ status }: { status: string }) {
  const cfg = PROJECT_COLUMNS.find((c) => c.status === status)
  if (!cfg) return <Badge className="rounded-full text-xs bg-muted text-muted-foreground border-transparent">{status}</Badge>
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', cfg.textClass)}>
      <SvgIcon name={cfg.iconName} size={13} className="shrink-0" />
      {cfg.label}
    </span>
  )
}

// ─── Factuur status chip ──────────────────────────────────────────────────────

function FactuurStatusBadge({ status }: { status: keyof typeof FACTUUR_STATUS_CONFIG }) {
  const cfg = FACTUUR_STATUS_CONFIG[status]
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${cfg.color}22`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

interface EditDialogProps {
  klant: Klant
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

function EditDialog({ klant, open, onOpenChange, onSaved }: EditDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    const input = {
      naam: data.get('naam') as string,
      type: data.get('type') as KlantType,
      status: data.get('status') as KlantStatus,
      contactpersoon: (data.get('contactpersoon') as string) || null,
      email: (data.get('email') as string) || null,
      telefoon: (data.get('telefoon') as string) || null,
      website: (data.get('website') as string) || null,
      notities: (data.get('notities') as string) || null,
    }

    startTransition(async () => {
      const res = await updateKlant(klant.id, input)
      if (res.error) {
        setError(res.error)
      } else {
        setError(null)
        onOpenChange(false)
        onSaved()
        toast('Klant bijgewerkt')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]" showCloseButton>
        <DialogHeader>
          <DialogTitle>Klant bewerken</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {/* Naam */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-naam">
              Klantnaam <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-naam"
              name="naam"
              required
              defaultValue={klant.naam}
            />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-type">Type</Label>
            <Select name="type" defaultValue={klant.type}>
              <SelectTrigger id="edit-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="one-off">One-off</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-status">Status</Label>
            <Select name="status" defaultValue={klant.status}>
              <SelectTrigger id="edit-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="actief">Actief</SelectItem>
                  <SelectItem value="gepauzeerd">Gepauzeerd</SelectItem>
                  <SelectItem value="gearchiveerd">Gearchiveerd</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Contactpersoon */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-contactpersoon">Contactpersoon</Label>
            <Input
              id="edit-contactpersoon"
              name="contactpersoon"
              defaultValue={klant.contactpersoon ?? ''}
              placeholder="Naam contactpersoon"
            />
          </div>

          {/* Email + Telefoon */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                defaultValue={klant.email ?? ''}
                placeholder="naam@domein.nl"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-telefoon">Telefoon</Label>
              <Input
                id="edit-telefoon"
                name="telefoon"
                defaultValue={klant.telefoon ?? ''}
                placeholder="06 12345678"
              />
            </div>
          </div>

          {/* Website */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-website">Website</Label>
            <Input
              id="edit-website"
              name="website"
              defaultValue={klant.website ?? ''}
              placeholder="https://voorbeeld.nl"
            />
          </div>

          {/* Notities */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-notities">Notities</Label>
            <Textarea
              id="edit-notities"
              name="notities"
              defaultValue={klant.notities ?? ''}
              placeholder="Interne notities over deze klant..."
            />
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isPending} variant="default">
              {isPending ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface KlantDetailModuleProps {
  klant: Klant
  projects: KlantProject[]
  facturen: KlantFactuur[]
}

export function KlantDetailModule({ klant, projects, facturen }: KlantDetailModuleProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)

  function handleSaved() {
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-border shrink-0">
        <div className="flex items-center justify-between pl-8 pr-3 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/klanten"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Terug naar klanten"
            >
              <SvgIcon name="arrow-left" size={16} />
            </Link>
            <span className="text-sm font-medium text-foreground truncate">{klant.naam}</span>
            <TypeBadge type={klant.type} />
            <StatusBadge status={klant.status} />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <SvgIcon name="pencil" size={14} className="mr-1.5" />
              Bewerken
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">

          {/* Contactgegevens */}
          <Card>
            <CardHeader>
              <CardTitle>Contactgegevens</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {klant.contactpersoon && (
                  <div>
                    <dt className="text-muted-foreground text-xs mb-0.5">Contactpersoon</dt>
                    <dd className="font-medium">{klant.contactpersoon}</dd>
                  </div>
                )}
                {klant.email && (
                  <div>
                    <dt className="text-muted-foreground text-xs mb-0.5">Email</dt>
                    <dd>
                      <a
                        href={`mailto:${klant.email}`}
                        className="text-foreground hover:underline"
                      >
                        {klant.email}
                      </a>
                    </dd>
                  </div>
                )}
                {klant.telefoon && (
                  <div>
                    <dt className="text-muted-foreground text-xs mb-0.5">Telefoon</dt>
                    <dd>
                      <a
                        href={`tel:${klant.telefoon}`}
                        className="text-foreground hover:underline"
                      >
                        {klant.telefoon}
                      </a>
                    </dd>
                  </div>
                )}
                {klant.website && (
                  <div>
                    <dt className="text-muted-foreground text-xs mb-0.5">Website</dt>
                    <dd>
                      <a
                        href={klant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground hover:underline flex items-center gap-1"
                      >
                        {klant.website}
                        <SvgIcon name="external-link" size={12} className="text-muted-foreground shrink-0" />
                      </a>
                    </dd>
                  </div>
                )}
                {!klant.contactpersoon && !klant.email && !klant.telefoon && !klant.website && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">
                      Nog geen contactgegevens.{' '}
                      <button
                        onClick={() => setEditOpen(true)}
                        className="underline underline-offset-2 cursor-pointer"
                      >
                        Toevoegen
                      </button>
                    </p>
                  </div>
                )}
              </dl>
              {klant.notities && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-muted-foreground text-xs mb-1">Notities</p>
                  <p className="text-sm whitespace-pre-wrap">{klant.notities}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projecten */}
          <Card>
            <CardHeader>
              <CardTitle>Projecten</CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nog geen projecten.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {projects.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      {p.kleur && (
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: p.kleur }}
                        />
                      )}
                      <Link
                        href={`/projecten/${p.id}`}
                        className="text-sm font-medium text-foreground hover:underline flex-1 truncate"
                      >
                        {p.naam}
                      </Link>
                      <ProjectStatusBadge status={p.status} />
                      {p.deadline && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(p.deadline + 'T12:00:00').toLocaleDateString('nl-NL', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Facturatie */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Facturatie</CardTitle>
              <Link
                href="/timeline"
                className="text-xs text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
              >
                Bekijk op tijdlijn
                <SvgIcon name="arrow-right" size={12} className="shrink-0" />
              </Link>
            </CardHeader>
            <CardContent>
              {facturen.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nog geen facturen.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {facturen.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="text-sm flex-1 truncate">{f.label}</span>
                      <span className="text-sm font-medium shrink-0">
                        {new Intl.NumberFormat('nl-NL', {
                          style: 'currency',
                          currency: 'EUR',
                        }).format(f.amount)}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(f.due_date + 'T12:00:00').toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <FactuurStatusBadge status={f.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Edit dialog */}
      <EditDialog
        klant={klant}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={handleSaved}
      />
    </div>
  )
}
