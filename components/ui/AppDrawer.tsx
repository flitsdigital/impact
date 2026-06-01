'use client'

import * as React from 'react'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/Drawer'
import { cn } from '@/lib/utils'

interface AppDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accessible label (rendered sr-only as the DrawerTitle). */
  title: string
  /** Max width of the floating panel in px. */
  width?: number
  className?: string
  children: React.ReactNode
}

/**
 * Universal floating side-panel drawer used across the app (task detail,
 * content post, …). Provides the chrome only — compose the inside with
 * `AppDrawerHeader` / `AppDrawerMeta` / `AppDrawerBody` / `AppDrawerFooter`.
 *
 * The `data-[vaul-drawer-direction=right]:` prefixes override the edge-attached
 * defaults baked into `DrawerContent`, turning it into an inset floating panel.
 */
export function AppDrawer({ open, onOpenChange, title, width = 620, className, children }: AppDrawerProps) {
  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        style={{ maxWidth: width }}
        className={cn(
          'overflow-hidden bg-bg-1',
          'data-[vaul-drawer-direction=right]:inset-y-4',
          'data-[vaul-drawer-direction=right]:right-4',
          'data-[vaul-drawer-direction=right]:h-[calc(100dvh-2rem)]',
          'data-[vaul-drawer-direction=right]:w-full',
          'data-[vaul-drawer-direction=right]:rounded-xl',
          'data-[vaul-drawer-direction=right]:border',
          'data-[vaul-drawer-direction=right]:border-border-subtle',
          'data-[vaul-drawer-direction=right]:sm:max-w-none',
          className,
        )}
      >
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        {children}
      </DrawerContent>
    </Drawer>
  )
}

/** Top bar: title/identity on the left, actions (e.g. close) on the right. */
export function AppDrawerHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-4 py-3', className)}>
      {children}
    </div>
  )
}

/** Optional bordered band for the inline metadata pills (status, date, …). */
export function AppDrawerMeta({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex shrink-0 flex-wrap items-center gap-2 border-b border-border-subtle px-4 py-3', className)} data-vaul-no-drag>
      {children}
    </div>
  )
}

/** Scrollable content region. */
export function AppDrawerBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4', className)} data-vaul-no-drag>
      {children}
    </div>
  )
}

/** Bottom action bar. Defaults to right-aligned; override `className` for split layouts. */
export function AppDrawerFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle px-4 py-3', className)}>
      {children}
    </div>
  )
}
