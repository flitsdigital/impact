'use client'

import { useState, useRef, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DocumentIcon } from '@/components/projecten/DocumentIcon'
import type { ProjectDocument } from '@/types/project'
import { addProjectDocument, deleteProjectDocument, uploadProjectFile } from '@/app/(app)/projecten/actions'

type TabId = 'link' | 'bestand'

interface BijlageModalProps {
  open:          boolean
  onOpenChange:  (open: boolean) => void
  projectId:     string
  documents:     ProjectDocument[]
  onDocumentsChange: (docs: ProjectDocument[]) => void
}

export function BijlageModal({
  open,
  onOpenChange,
  projectId,
  documents,
  onDocumentsChange,
}: BijlageModalProps) {
  const [tab, setTab]         = useState<TabId>('link')
  const [naam, setNaam]       = useState('')
  const [url, setUrl]         = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef               = useRef<HTMLInputElement>(null)
  const [, startTransition]   = useTransition()

  if (!open) return null

  function resetForm() {
    setNaam('')
    setUrl('')
    setError(null)
  }

  function handleTabChange(t: TabId) {
    setTab(t)
    resetForm()
  }

  async function handleAddLink() {
    if (!naam.trim() || !url.trim()) {
      setError('Vul een naam en URL in.')
      return
    }
    let fullUrl = url.trim()
    if (!/^https?:\/\//i.test(fullUrl)) fullUrl = 'https://' + fullUrl

    setError(null)
    const result = await addProjectDocument(projectId, 'link', naam.trim(), fullUrl)
    if (result.error) { setError(result.error); return }

    const newDoc: ProjectDocument = {
      id: result.id!,
      project_id: projectId,
      type: 'link',
      naam: naam.trim(),
      url: fullUrl,
      created_at: new Date().toISOString(),
    }
    onDocumentsChange([...documents, newDoc])
    resetForm()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = naam.trim() || file.name

    if (file.size > 20 * 1024 * 1024) {
      setError('Bestand is te groot (max 20 MB).')
      return
    }

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    const uploadResult = await uploadProjectFile(projectId, formData)

    if (uploadResult.error) {
      setError(uploadResult.error)
      setUploading(false)
      return
    }

    const docResult = await addProjectDocument(projectId, 'file', fileName, uploadResult.url!)
    if (docResult.error) {
      setError(docResult.error)
      setUploading(false)
      return
    }

    const newDoc: ProjectDocument = {
      id: docResult.id!,
      project_id: projectId,
      type: 'file',
      naam: fileName,
      url: uploadResult.url!,
      created_at: new Date().toISOString(),
    }
    onDocumentsChange([...documents, newDoc])
    resetForm()
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleDeleteDoc(docId: string) {
    onDocumentsChange(documents.filter((d) => d.id !== docId))
    startTransition(() => { deleteProjectDocument(docId) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-bg-1 rounded-xl border border-border shadow-2xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <span className="text-[14px] font-semibold text-fg-1">Bijlagen beheren</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Sluiten"
            className="text-fg-3"
          >
            <SvgIcon name="x" size={15} />
          </Button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-0 px-5 pt-4 shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange('link')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-t border-b-2 transition-colors',
              tab === 'link'
                ? 'border-fg-1 text-fg-1'
                : 'border-transparent text-fg-3 hover:text-fg-2',
            )}
          >
            <SvgIcon name="link" size={13} />
            Link toevoegen
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('bestand')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-t border-b-2 transition-colors',
              tab === 'bestand'
                ? 'border-fg-1 text-fg-1'
                : 'border-transparent text-fg-3 hover:text-fg-2',
            )}
          >
            <SvgIcon name="upload" size={13} />
            Bestand uploaden
          </button>
        </div>

        {/* Form */}
        <div className="px-5 pt-4 pb-3 shrink-0 border-b border-border">
          {tab === 'link' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-fg-3 font-medium uppercase tracking-wide">Naam</label>
                <Input
                  type="text"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  placeholder="bijv. Offerte, Design brief..."
                  className="h-auto w-full rounded bg-bg-2 px-3 py-2 text-[13px] placeholder:text-fg-disabled"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-fg-3 font-medium uppercase tracking-wide">URL</label>
                <Input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://docs.google.com/..."
                  className="h-auto w-full rounded bg-bg-2 px-3 py-2 text-[13px] placeholder:text-fg-disabled"
                />
              </div>
              {error && <p className="text-[11px] text-red-400">{error}</p>}
              <Button
                size="sm"
                onClick={handleAddLink}
                disabled={!naam.trim() || !url.trim()}
                className="self-start"
              >
                Toevoegen
              </Button>
            </div>
          )}

          {tab === 'bestand' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-fg-3 font-medium uppercase tracking-wide">Naam (optioneel)</label>
                <Input
                  type="text"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  placeholder="Laat leeg voor bestandsnaam"
                  className="h-auto w-full rounded bg-bg-2 px-3 py-2 text-[13px] placeholder:text-fg-disabled"
                />
              </div>
              <label
                className={cn(
                  'flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-lg cursor-pointer transition-colors',
                  uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-fg-3 hover:bg-bg-2',
                )}
              >
                <SvgIcon name="upload" size={20} className="text-fg-3" />
                <span className="text-[12px] text-fg-2 text-center">
                  {uploading ? 'Uploaden...' : 'Klik of sleep een PDF hierheen'}
                </span>
                <span className="text-[11px] text-fg-disabled">PDF, max 20 MB</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="sr-only"
                />
              </label>
              {error && <p className="text-[11px] text-red-400">{error}</p>}
            </div>
          )}
        </div>

        {/* Existing documents */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {documents.length === 0 ? (
            <p className="text-[12px] text-fg-disabled text-center py-4">Nog geen bijlagen toegevoegd.</p>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-[11px] text-fg-3 uppercase tracking-wide font-medium mb-2">
                Bijlagen ({documents.length})
              </p>
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 py-1.5 group">
                  <DocumentIcon type={doc.type} url={doc.url} size={13} />
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-[12px] text-fg-2 hover:text-fg-1 truncate flex items-center gap-1"
                  >
                    {doc.naam}
                    <SvgIcon name="external-link" size={10} className="shrink-0 opacity-50" />
                  </a>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleDeleteDoc(doc.id)}
                    aria-label="Bijlage verwijderen"
                    className="text-fg-disabled hover:text-red-400 opacity-0 group-hover:opacity-100"
                  >
                    <SvgIcon name="trash" size={12} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
