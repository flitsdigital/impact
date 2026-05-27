'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerTitle,
} from '@/components/ui/Drawer'
import { Button }   from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Avatar }   from '@/components/ui/Avatar'
import { SvgIcon }  from '@/components/ui/SvgIcon'
import { cn }          from '@/lib/utils'
import { createPost, updatePost }  from '@/app/(app)/content/actions'
import type { Post, PostStatus, PostType } from '@/types/post'
import type { Klant }  from '@/types/klant'
import type { TeamMember } from '@/types/team'

// ─── Status icon names (shared with ContentModule) ────────────────────────────

export const STATUS_ICON: Record<PostStatus, string> = {
  te_doen:             'circle-dashed',
  bezig:               'circle-notch',
  klaar_voor_feedback: 'circle',
  akkoord:             'scrubber',
  gepost:              'circle-check',
}

export const STATUS_LABEL: Record<PostStatus, string> = {
  te_doen:             'Te doen',
  bezig:               'Bezig',
  klaar_voor_feedback: 'Klaar voor feedback',
  akkoord:             'Akkoord',
  gepost:              'Gepost',
}

const STATUS_ORDER: PostStatus[] = ['te_doen', 'bezig', 'klaar_voor_feedback', 'akkoord', 'gepost']

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

// ─── Native pill select ───────────────────────────────────────────────────────

function PillSelect({ name, value, onChange, children, icon, className }: {
  name: string; value: string; onChange: (v: string) => void
  children: React.ReactNode; icon?: string; className?: string
}) {
  return (
    <div className="relative inline-flex items-center">
      {icon && (
        <span className="pointer-events-none absolute left-2 flex items-center text-muted-foreground">
          <SvgIcon name={icon} size={12} />
        </span>
      )}
      <select
        name={name} value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-7 appearance-none rounded-full border border-border bg-secondary text-xs text-foreground outline-none cursor-pointer focus:border-ring pr-5',
          icon ? 'pl-6' : 'pl-3', className
        )}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-2 text-muted-foreground">
        <SvgIcon name="caret-down" size={10} />
      </span>
    </div>
  )
}

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

  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [status,           setStatus]       = useState<PostStatus>('te_doen')
  const [klantId,          setKlantId]      = useState('__none__')
  const [type,             setType]         = useState<PostType>('foto')
  const [date,             setDate]         = useState(defaultDate ?? new Date().toISOString().slice(0, 10))
  const [caption,          setCaption]      = useState('')
  const [assigneeIds,      setAssigneeIds]  = useState<string[]>([])
  const [rawFile,          setRawFile]      = useState<File | null>(null)
  const [preview,          setPreview]      = useState<string | null>(null)
  const [mediaCleared,     setMediaCleared] = useState(false)
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
      setDate(post.scheduled_at ?? new Date().toISOString().slice(0, 10))
      setCaption(post.caption ?? '')
      setAssigneeIds((post.assignees ?? []).map((a) => a.id))
      setPreview(post.media_url ?? null)
      setRawFile(null)
      setMediaCleared(false)
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
      setDate(defaultDate ?? new Date().toISOString().slice(0, 10))
      setCaption(''); setAssigneeIds([]); setRawFile(null); setPreview(null)
      setMediaCleared(false); setError(null)
    }
  }, [open, post, defaultDate])

  // ── Media ───────────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRawFile(file)
    setPreview(URL.createObjectURL(file))
    setMediaCleared(false)
  }

  function clearMedia() {
    setRawFile(null)
    setPreview(null)
    setMediaCleared(true)
    if (fileRef.current) fileRef.current.value = ''
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
    if (mediaCleared) fd.set('clear_media', '1')
    if (rawFile) {
      const compressed = await compressImage(rawFile)
      fd.set('media', compressed, compressed.name)
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
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        style={{
          top: '1rem', bottom: '1rem', right: '1rem',
          height: 'calc(100dvh - 2rem)',
          maxWidth: '620px', width: '100%',
          background: '#0F0F10', border: '1px solid #1D1E1F',
          borderRadius: '12px', overflow: 'hidden',
        }}
        className="rounded-xl"
      >
        <DrawerTitle className="sr-only">
          {isEdit ? 'Post bewerken' : 'Nieuwe post maken'}
        </DrawerTitle>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          data-vaul-no-drag
          className="flex flex-col h-full"
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2 text-muted-foreground">
              <SvgIcon name={isEdit ? 'file-text' : 'file-text'} size={14} />
              <span className="text-sm font-medium text-foreground">
                {isEdit ? 'Post bewerken' : 'Nieuwe post maken'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isEdit && (
                <button
                  type="button"
                  onClick={copyPreviewLink}
                  className={cn(
                    'h-7 rounded-full border border-border bg-secondary px-2.5 text-xs flex items-center gap-1.5 transition-colors',
                    linkCopied
                      ? 'text-green-500 border-green-500/30'
                      : 'text-muted-foreground hover:text-foreground hover:border-ring',
                  )}
                >
                  {linkCopied
                    ? <><SvgIcon name="check" size={11} />Gekopieerd!</>
                    : 'Deel link'
                  }
                </button>
              )}
              <DrawerClose asChild>
                <Button variant="ghost" size="icon-sm" type="button" className="text-muted-foreground">
                  <SvgIcon name="x" size={14} />
                </Button>
              </DrawerClose>
            </div>
          </div>

          {/* ── Metadata pills ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border shrink-0">
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
            <div className="relative inline-flex items-center">
              <span className="pointer-events-none absolute left-2 flex items-center text-muted-foreground">
                <SvgIcon name="calendar" size={12} />
              </span>
              <input
                type="date" value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-7 appearance-none rounded-full border border-border bg-secondary pl-6 pr-3 text-xs text-foreground outline-none cursor-pointer focus:border-ring"
              />
            </div>

            {/* Teamleden */}
            <AssigneePicker teamleden={teamleden} value={assigneeIds} onChange={setAssigneeIds} />
          </div>

          {/* ── Scrollable body ────────────────────────────────────── */}
          <div className="flex-1 overflow-auto p-4 flex flex-col gap-3 min-h-0">
            {/* Media upload / preview */}
            {preview ? (
              <div className="relative rounded-md overflow-hidden border border-border shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="w-full max-h-52 object-cover" />
                <button
                  type="button" onClick={clearMedia}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-bg-0/80 text-foreground hover:bg-bg-0 transition-colors"
                >
                  <SvgIcon name="x" size={13} />
                </button>
                {rawFile && (
                  <span className="absolute bottom-2 left-2 text-[10px] bg-bg-0/80 rounded px-2 py-0.5 text-muted-foreground">
                    {rawFile.name} {rawFile.size > 3_000_000 && '(wordt gecomprimeerd)'}
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button" onClick={() => fileRef.current?.click()}
                className="w-full h-[154px] rounded-md bg-secondary flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors shrink-0"
              >
                <SvgIcon name="upload" size={20} />
                <span className="text-xs">
                  {isEdit ? 'Nieuwe afbeelding toevoegen' : 'Voeg een foto toe'}
                </span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />

            {/* Caption */}
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Begin met het schrijven van een caption..."
              className="flex-1 min-h-[180px] bg-secondary border-0 rounded-md text-xs placeholder:text-xs focus-visible:ring-1 focus-visible:ring-ring/50 resize-none"
            />

            {error && <p className="text-xs text-destructive shrink-0">{error}</p>}
          </div>

          {/* ── Footer ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border shrink-0">
            <DrawerClose asChild>
              <Button variant="outline" size="sm" type="button">Annuleren</Button>
            </DrawerClose>
            <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
              <SvgIcon name="save" size={13} />
              {isPending ? 'Opslaan...' : 'Opslaan'}
              <span className="flex items-center gap-0.5 ml-1 opacity-50">
                <kbd className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-sm bg-primary-foreground/10">⌘</kbd>
                <kbd className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-sm bg-primary-foreground/10">↵</kbd>
              </span>
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
