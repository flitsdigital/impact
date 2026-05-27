'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { ImageIcon, VideoIcon, Film, LayoutGrid, Upload, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button }   from '@/components/ui/Button'
import { Label }    from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { createPost } from '@/app/(app)/content/actions'
import type { PostStatus, PostType } from '@/types/post'
import type { Klant } from '@/types/klant'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: PostStatus; label: string }[] = [
  { value: 'te_doen',            label: 'Te doen' },
  { value: 'bezig',              label: 'Bezig' },
  { value: 'klaar_voor_feedback', label: 'Klaar voor feedback' },
  { value: 'akkoord',            label: 'Akkoord' },
  { value: 'gepost',             label: 'Gepost' },
]

const TYPE_OPTIONS: { value: PostType; label: string; icon: React.ElementType }[] = [
  { value: 'foto',     label: 'Foto',     icon: ImageIcon },
  { value: 'video',    label: 'Video',    icon: VideoIcon },
  { value: 'reel',     label: 'Reel',     icon: Film },
  { value: 'carousel', label: 'Carousel', icon: LayoutGrid },
]

const INITIAL: { error?: string; success?: boolean } | null = null

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  klanten: Pick<Klant, 'id' | 'naam'>[]
  defaultDate?: string  // "YYYY-MM-DD"
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NieuwePostModal({ open, onOpenChange, klanten, defaultDate }: Props) {
  const [state, action, pending] = useActionState(createPost, INITIAL)
  const formRef    = useRef<HTMLFormElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  // Close on success
  useEffect(() => {
    if (state?.success) {
      onOpenChange(false)
      formRef.current?.reset()
      setPreview(null)
      setFileName(null)
    }
  }, [state?.success, onOpenChange])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  function clearMedia() {
    setPreview(null)
    setFileName(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]" showCloseButton>
        <DialogHeader>
          <DialogTitle>Nieuwe post maken</DialogTitle>
        </DialogHeader>

        <form ref={formRef} action={action} className="flex flex-col gap-4">
          {/* ── Metadata pills ── */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status */}
            <Select name="status" defaultValue="te_doen">
              <SelectTrigger className="h-7 w-auto min-w-0 rounded-full border-border bg-secondary px-3 text-xs gap-1.5 [&>svg]:size-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Klant */}
            <Select name="klant_id" defaultValue="__none__">
              <SelectTrigger className="h-7 w-auto min-w-0 rounded-full border-border bg-secondary px-3 text-xs gap-1.5 [&>svg]:size-3">
                <SelectValue placeholder="Geen klant" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__none__">Geen klant</SelectItem>
                  {klanten.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.naam}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Type */}
            <Select name="type" defaultValue="foto">
              <SelectTrigger className="h-7 w-auto min-w-0 rounded-full border-border bg-secondary px-3 text-xs gap-1.5 [&>svg]:size-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TYPE_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Datum */}
            <input
              name="scheduled_at"
              type="date"
              defaultValue={defaultDate ?? new Date().toISOString().slice(0, 10)}
              className="h-7 rounded-full border border-border bg-secondary px-3 text-xs text-foreground outline-none focus:border-ring"
            />
          </div>

          {/* ── Media upload ── */}
          <div className="flex flex-col gap-1">
            {preview ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="w-full max-h-56 object-cover" />
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-bg-0/80 text-foreground hover:bg-bg-0 transition-colors"
                >
                  <X size={14} />
                </button>
                {fileName && (
                  <span className="absolute bottom-2 left-2 text-xs bg-bg-0/80 rounded px-2 py-0.5 text-foreground">
                    {fileName}
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-44 rounded-xl border border-dashed border-border bg-secondary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-ring hover:text-foreground transition-colors"
              >
                <Upload size={22} />
                <span className="text-xs">Voeg een foto toe</span>
              </button>
            )}
            {/* Hidden file input — included in FormData automatically */}
            <input
              ref={fileRef}
              name="media"
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* ── Caption ── */}
          <div className="flex flex-col gap-1.5">
            <Textarea
              name="caption"
              placeholder="Begin met het schrijven van een caption..."
              className="min-h-[100px] bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-ring/50 text-sm"
            />
          </div>

          {/* ── Error ── */}
          {state?.error && (
            <p className="text-xs text-destructive">{state.error}</p>
          )}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {pending ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
