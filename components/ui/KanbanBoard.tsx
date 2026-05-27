'use client'

/**
 * Generic Kanban Board — shared between Content and Projecten (and any future module).
 *
 * Manages only drag-visualisation state (draggingId, dragOverKey).
 * Optimistic data updates live in the parent — the parent passes the current
 * `items` array and handles `onMove` (update local state + call server action).
 */

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface KanbanColumnDef {
  key: string
  label: string
  iconName?: string
  textClass?: string
  /** Start collapsed — renders as a thin clickable strip instead of a full column */
  isCollapsed?: boolean
}

export interface KanbanBoardProps<TItem> {
  columns:      KanbanColumnDef[]
  items:        TItem[]
  getColKey:    (item: TItem) => string
  getItemId:    (item: TItem) => string
  renderCard:   (item: TItem, isDragging: boolean) => React.ReactNode
  onMove:       (itemId: string, toKey: string) => void
  onAddItem?:   (colKey: string) => void
  addItemLabel?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KanbanBoard<TItem>({
  columns,
  items,
  getColKey,
  getItemId,
  renderCard,
  onMove,
  onAddItem,
  addItemLabel = 'Item toevoegen',
}: KanbanBoardProps<TItem>) {
  const [draggingId,  setDraggingId]  = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const [collapsedCols, setCollapsedCols] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.isCollapsed).map((c) => c.key)),
  )
  const fromKeyRef = useRef<string | null>(null)

  function toggleCollapse(key: string) {
    setCollapsedCols((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── Drag handlers ────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, itemId: string, colKey: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemId)
    fromKeyRef.current = colKey
    setDraggingId(itemId)
  }, [])

  const handleDragEnd = useCallback(() => {
    fromKeyRef.current = null
    setDraggingId(null)
    setDragOverKey(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverKey((prev) => (prev === key ? prev : key))
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverKey(null)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, toKey: string) => {
    e.preventDefault()
    const itemId = e.dataTransfer.getData('text/plain') || draggingId
    const fromKey = fromKeyRef.current

    fromKeyRef.current = null
    setDraggingId(null)
    setDragOverKey(null)

    if (itemId && fromKey !== toKey) {
      onMove(itemId, toKey)
    }
  }, [draggingId, onMove])

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden p-4 gap-4">
      {columns.map((col) => {
        const colItems  = items.filter((item) => getColKey(item) === col.key)
        const isOver    = dragOverKey === col.key
        const collapsed = collapsedCols.has(col.key)

        // ── Collapsed column: thin vertical strip ─────────────────────────────
        if (collapsed) {
          return (
            <div
              key={col.key}
              className={cn(
                'shrink-0 w-[34px] bg-bg-0 rounded-md flex flex-col items-center',
                'cursor-pointer transition-colors hover:bg-bg-3/20',
                isOver && 'bg-bg-3/30',
              )}
              onClick={() => toggleCollapse(col.key)}
              title={`${col.label} uitklappen`}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => { handleDrop(e, col.key); toggleCollapse(col.key) }}
            >
              <div className="flex flex-col items-center gap-2 pt-3 overflow-hidden">
                {col.iconName && (
                  <SvgIcon
                    name={col.iconName}
                    size={12}
                    className={cn('shrink-0', col.textClass ?? 'text-fg-2')}
                  />
                )}
                <span
                  className={cn('text-[12px] font-medium whitespace-nowrap', col.textClass ?? 'text-fg-2')}
                  style={{ writingMode: 'vertical-rl' }}
                >
                  {col.label}
                </span>
                <span className="inline-flex items-center justify-center size-[18px] rounded-sm bg-bg-3 text-[10px] text-fg-3 shrink-0">
                  {colItems.length}
                </span>
              </div>
            </div>
          )
        }

        // ── Full column ───────────────────────────────────────────────────────
        return (
          <div
            key={col.key}
            className={cn(
              'flex-1 bg-bg-0 rounded-md flex flex-col min-w-[180px] transition-colors overflow-hidden',
              isOver && 'ring-1 ring-border-strong',
            )}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            {/* ── Column header ── */}
            <div className="flex items-center justify-between px-2 py-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {col.iconName && (
                    <SvgIcon
                      name={col.iconName}
                      size={13}
                      className={cn('shrink-0', col.textClass ?? 'text-fg-2')}
                    />
                  )}
                  <span className={cn('text-[12px] font-medium', col.textClass ?? 'text-fg-1')}>
                    {col.label}
                  </span>
                </div>
                <span className="inline-flex items-center justify-center size-[18px] rounded-sm bg-bg-3 text-[10px] text-fg-3">
                  {colItems.length}
                </span>
              </div>

              {onAddItem && (
                <button
                  type="button"
                  onClick={() => onAddItem(col.key)}
                  className="size-[18px] flex items-center justify-center rounded-sm text-fg-3 hover:text-fg-1 hover:bg-bg-3 shrink-0 transition-colors"
                  title={`${addItemLabel} in ${col.label}`}
                >
                  <SvgIcon name="plus" size={12} />
                </button>
              )}
            </div>

            {/* ── Cards ── */}
            <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">
              {colItems.map((item) => {
                const id = getItemId(item)
                return (
                  <div
                    key={id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, id, col.key)}
                    onDragEnd={handleDragEnd}
                  >
                    {renderCard(item, draggingId === id)}
                  </div>
                )
              })}

              {onAddItem && (
                <button
                  type="button"
                  onClick={() => onAddItem(col.key)}
                  className="w-full rounded border border-dashed border-border-subtle p-2 flex items-center gap-1.5 text-fg-3 hover:border-border-strong hover:text-fg-2 transition-colors text-[12px] shrink-0"
                >
                  <SvgIcon name="plus" size={12} />
                  {addItemLabel}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
