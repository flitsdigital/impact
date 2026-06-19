'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { DrawerClose } from '@/components/ui/Drawer'
import {
  AppDrawer,
  AppDrawerHeader,
  AppDrawerMeta,
  AppDrawerBody,
  AppDrawerFooter,
} from '@/components/ui/AppDrawer'
import { PillSelect } from '@/components/ui/PillSelect'
import { Button, buttonVariants }   from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Textarea } from '@/components/ui/Textarea'
import { Avatar }   from '@/components/ui/Avatar'
import { SvgIcon }  from '@/components/ui/SvgIcon'
import { cn }          from '@/lib/utils'
import { toLocalDateStr } from '@/lib/dates'
import { createPost, updatePost }  from '@/app/(app)/content/actions'
import type { Post, PostStatus, PostType } from '@/types/post'
import { STATUS_ICON, STATUS_LABEL, STATUS_ORDER } from '@/types/post'
import type { Klant }  from '@/types/klant'
import type { TeamMember } from '@/types/team'

const TYPE_OPTIONS: { value: PostType; label: string; iconName: string }[] = [
  { value: 'foto',     label: 'Foto',     iconName: 'image-square' },
  { value: 'video',    label: 'Video',    iconName: 'video' },
  { value: 'reel',     label: 'Reel',     iconName: 'reel' },
  { value: 'carousel', label: 'Carousel', iconName: 'layout-grid' },
]

// ─── Image compression ────────────────────────────────────────────────────────

async function compressImage(file: File, maxBytes = 3_000_000): Promise<File> {
  if (file.size <= maxBytes || !file.type.startsWith('image/')) return file
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const maxDim = 1920
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height)
        width = Math.round(width * scale); height = Math.round(height * scale)
      }
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      let quality = 0.85
      const tryCompress = () => {
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file)
          if (blob.size <= maxBytes || quality <= 0.3) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg', lastModified: file.lastModified }))
          } else { quality -= 0.1; tryCompress() }
        }, 'image/jpeg', quality)
      }
      tryCompress()
    }
    img.src = URL.createObjectURL(file)
  })
}

// ─── Media ────────────────────────────────────────────────────────────────────
// Een geordende lijst: bestaande (opgeslagen) URLs + nieuw gekozen bestanden.
// Nieuwe bestanden worden altijd achteraan toegevoegd, zodat de zicht-volgorde
// gelijk is aan de opslag-volgorde (server: behouden URLs eerst, dan uploads).

type MediaItem =
  | { kind: 'url';  url: string }
  | { kind: 'file'; file: File; preview: string }

// ─── Assignee picker ──────────────────────────────────────────────────────────

function AssigneePicker({ teamleden, value, onChange }: {
  teamleden: TeamMember[]
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }

  const selected = teamleden.filter((m) => value.includes(m.id))

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      {/* Selected avatar stack */}
      {selected.length > 0 && (
        <div className="flex items-center">
          {selected.slice(0, 3).map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              title={`Verwijder ${m.full_name ?? m.email}`}
              className="relative group focus:outline-none"
              style={{ marginLeft: i > 0 ? '-6px' : 0, zIndex: selected.length - i }}
            >
              <Avatar
                src={m.avatar_url}
                name={m.full_name ?? undefined}
                size={24}
                className="ring-1 ring-bg-0 transition-opacity group-hover:opacity-60"
              />
            </button>
          ))}
          {selected.length > 3 && (
            <span className="size-6 -ml-1.5 rounded-full bg-muted text-[10px] flex items-center justify-center text-muted-foreground ring-1 ring-bg-0 z-0">
              +{selected.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="h-7 rounded-full border border-border bg-secondary px-2.5 text-xs text-muted-foreground hover:text-foreground hover:border-ring flex items-center gap-1.5 transition-colors"
      >
        <SvgIcon name="users" size={12} />
        {selected.length === 0 && <span>Teamlid</span>}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          data-vaul-no-drag
          className="absolute top-9 left-0 z-30 w-56 bg-bg-1 border border-border rounded-lg shadow-xl p-1 flex flex-col gap-0.5"
        >
          {teamleden.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-1.5">Geen teamleden gevonden</p>
          ) : teamleden.map((m) => {
            const isSelected = value.includes(m.id)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-muted text-left w-full transition-colors"
              >
                <Avatar src={m.avatar_url} name={m.full_name ?? undefined} size={22} />
                <span className="flex-1 truncate">{m.full_name ?? m.email ?? 'Onbekend'}</span>
                {isSelected && <SvgIcon name="check" size={11} className="text-primary shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open:         boolean
  onOpenChange: (open: boolean) => void
  klanten:      Pick<Klant, 'id' | 'naam'>[]
  teamleden:    TeamMember[]
  defaultDate?: string
  post?:        Post   // if set → edit mode
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NieuwePostDrawer({ open, onOpenChange, klanten, teamleden, defaultDate, post }: Props) {
  const isEdit = !!post

  const fileRef = useRef<HTMLInputElement>(null)

  const [status,           setStatus]       = useState<PostStatus>('te_doen')
  const [klantId,          setKlantId]      = useState('__none__')
  const [type,             setType]         = useState<PostType>('foto')
  const [date,             setDate]         = useState(defaultDate ?? toLocalDateStr(new Date()))
  const [caption,          setCaption]      = useState('')
  const [assigneeIds,      setAssigneeIds]  = useState<string[]>([])
  const [media,            setMedia]        = useState<MediaItem[]>([])
  const [dragIndex,        setDragIndex]    = useState<number | null>(null)
  const [isPending,        startTransition] = useTransition()
  const [error,            setError]        = useState<string | null>(null)
  const [linkCopied,       setLinkCopied]   = useState(false)

  // ── Init / reset ────────────────────────────────────────────────────────────

  // Pre-fill state when switching to edit mode
  useEffect(() => {
    if (open && post) {
      setStatus(post.status)
      setKlantId(post.klant_id ?? '__none__')
      setType(post.type)
      setDate(post.scheduled_at ?? toLocalDateStr(new Date()))
      setCaption(post.caption ?? '')
      setAssigneeIds((post.assignees ?? []).map((a) => a.id))
      setMedia((post.media_urls ?? []).map((url) => ({ kind: 'url', url })))
      setError(null)
    }
  }, [open, post])

  // Sync defaultDate in create mode
  useEffect(() => {
    if (!post && defaultDate) setDate(defaultDate)
  }, [defaultDate, post])

  // Reset to defaults when closing in create mode
  useEffect(() => {
    if (!open && !post) {
      setStatus('te_doen'); setKlantId('__none__'); setType('foto')
      setDate(defaultDate ?? toLocalDateStr(new Date()))
      setCaption(''); setAssigneeIds([]); setMedia([]); setError(null)
    }
  }, [open, post, defaultDate])

  // ── Media ───────────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setMedia((prev) => [
      ...prev,
      ...files.map((file) => ({ kind: 'file' as const, file, preview: URL.createObjectURL(file) })),
    ])
    if (fileRef.current) fileRef.current.value = ''
  }

  function removeMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index))
  }

  function reorderMedia(from: number, to: number) {
    if (from === to) return
    setMedia((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    const fd = new FormData()
    if (isEdit) fd.set('id', post.id)
    fd.set('status',       status)
    fd.set('klant_id',     klantId)
    fd.set('type',         type)
    fd.set('scheduled_at', date)
    fd.set('caption',      caption)
    fd.set('assignee_ids', JSON.stringify(assigneeIds))
    // Manifest: behoudt exacte volgorde (url = bestaand, null = nieuw bestand).
    fd.set('media_order', JSON.stringify(media.map((m) => (m.kind === 'url' ? m.url : null))))
    for (const m of media) {
      if (m.kind === 'file') {
        const compressed = await compressImage(m.file)
        fd.append('media', compressed, compressed.name)
      }
    }
    startTransition(async () => {
      const result = isEdit
        ? await updatePost(null, fd)
        : await createPost(null, fd)
      if (result?.error)   setError(result.error)
      else if (result?.success) onOpenChange(false)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit(e as any)
  }

  // ── Share link ──────────────────────────────────────────────────────────────

  function copyPreviewLink() {
    if (!post) return
    const url = `${window.location.origin}/preview/${post.id}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  const currentTypeIcon = TYPE_OPTIONS.find(t => t.value === type)?.iconName ?? 'image-square'

  return (
    <AppDrawer open={open} onOpenChange={onOpenChange} title={isEdit ? 'Post bewerken' : 'Nieuwe post maken'}>
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        data-vaul-no-drag
        className="flex h-full flex-col"
      >
        <AppDrawerHeader>
            <div className="flex items-center gap-2 text-muted-foreground">
              <SvgIcon name="file-text" size={14} />
              <span className="text-sm font-medium text-foreground">
                {isEdit ? 'Post bewerken' : 'Nieuwe post maken'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyPreviewLink}
                  className={cn(
                    'rounded-full gap-1.5',
                    linkCopied && 'text-green-500 border-green-500/30 hover:text-green-500',
                  )}
                >
                  {linkCopied
                    ? <><SvgIcon name="check" size={11} />Gekopieerd!</>
                    : 'Deel link'
                  }
                </Button>
              )}
              <DrawerClose asChild>
                <Button variant="ghost" size="icon-sm" type="button" className="text-muted-foreground">
                  <SvgIcon name="x" size={14} />
                </Button>
              </DrawerClose>
            </div>
        </AppDrawerHeader>

        <AppDrawerMeta>
            {/* Status */}
            <PillSelect name="status" value={status} onChange={(v) => setStatus(v as PostStatus)} icon={STATUS_ICON[status]}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </PillSelect>

            {/* Klant */}
            <PillSelect name="klant_id" value={klantId} onChange={setKlantId} icon="users">
              <option value="__none__">Geen klant</option>
              {klanten.map((k) => (
                <option key={k.id} value={k.id}>{k.naam}</option>
              ))}
            </PillSelect>

            {/* Type */}
            <PillSelect name="type" value={type} onChange={(v) => setType(v as PostType)} icon={currentTypeIcon}>
              {TYPE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </PillSelect>

            {/* Datum */}
            <DatePicker
              variant="pill"
              value={date}
              onChange={setDate}
              placeholder="Datum"
            />

            {/* Teamleden */}
            <AssigneePicker teamleden={teamleden} value={assigneeIds} onChange={setAssigneeIds} />
        </AppDrawerMeta>

        <AppDrawerBody>
            {/* Media upload / preview — geordende lijst */}
            {media.length === 0 ? (
              <button
                type="button" onClick={() => fileRef.current?.click()}
                className="w-full h-[154px] rounded-md bg-secondary flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors shrink-0"
              >
                <SvgIcon name="upload" size={20} />
                <span className="text-xs">
                  {isEdit ? 'Afbeeldingen toevoegen' : 'Voeg foto’s toe'}
                </span>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2 shrink-0">
                {media.map((m, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragIndex !== null) reorderMedia(dragIndex, i); setDragIndex(null) }}
                    onDragEnd={() => setDragIndex(null)}
                    className={cn(
                      'relative aspect-square rounded-md overflow-hidden border border-border bg-secondary cursor-move',
                      dragIndex === i && 'opacity-40',
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.kind === 'url' ? m.url : m.preview}
                      alt={`Afbeelding ${i + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <span className="absolute top-1 left-1 text-[10px] bg-bg-0/80 rounded px-1.5 py-0.5 text-muted-foreground tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <button
                      type="button" onClick={() => removeMedia(i)}
                      title="Verwijderen"
                      className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-bg-0/80 text-foreground hover:bg-bg-0 transition-colors"
                    >
                      <SvgIcon name="x" size={12} />
                    </button>
                  </div>
                ))}
                <button
                  type="button" onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-md bg-secondary flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <SvgIcon name="upload" size={18} />
                  <span className="text-[10px]">Toevoegen</span>
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />

            {/* Caption */}
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Begin met het schrijven van een caption..."
              className="flex-1 min-h-[180px] bg-secondary border-0 rounded-md text-xs placeholder:text-xs focus-visible:ring-1 focus-visible:ring-ring/50 resize-none"
            />

            {error && <p className="text-xs text-destructive shrink-0">{error}</p>}
        </AppDrawerBody>

        <AppDrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" size="sm" type="button">Annuleren</Button>
            </DrawerClose>
            {isEdit && (post.media_urls?.length ?? 0) > 0 && (
              <a
                href={`/api/posts/${post.id}/download`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 mr-auto')}
              >
                <SvgIcon name="download" size={13} />
                Download afbeeldingen (.zip)
              </a>
            )}
            <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
              <SvgIcon name="save" size={13} />
              {isPending ? 'Opslaan...' : 'Opslaan'}
              <span className="flex items-center gap-0.5 ml-1 opacity-50">
                <kbd className="inline-flex items-center justify-center size-4 text-[10px] rounded-sm bg-primary-foreground/10">⌘</kbd>
                <kbd className="inline-flex items-center justify-center size-4 text-[10px] rounded-sm bg-primary-foreground/10">↵</kbd>
              </span>
            </Button>
        </AppDrawerFooter>
      </form>
    </AppDrawer>
  )
}
