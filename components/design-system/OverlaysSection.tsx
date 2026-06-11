'use client'

import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { AppDrawer, AppDrawerHeader, AppDrawerBody } from '@/components/ui/AppDrawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { BijlageModal, type BijlageDocument } from '@/components/ui/BijlageModal'
import { DemoBlock, SectionHeading } from './DemoBlock'

export function OverlaysSection() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [bijlageOpen, setBijlageOpen] = useState(false)
  const [demoDocs, setDemoDocs] = useState<BijlageDocument[]>([
    { id: 'demo-1', type: 'link', naam: 'Design brief', url: 'https://docs.google.com/document/d/voorbeeld' },
  ])

  return (
    <section className="flex flex-col gap-8">
      <SectionHeading
        id="overlays"
        title="Overlays"
        intro="Dialogs, drawers en popups. Let op: base-ui popups (Select, DropdownMenu, Popover) binnen een vaul-Drawer hebben pointer-events-auto nodig — dat zit al in de Content-componenten gebakken."
      />

      <DemoBlock
        title="Dialog"
        path="@/components/ui/Dialog"
        description="Modaal venster voor formulieren en bevestigingen (zie KlantToevoegenModal). Subcomponenten: Header, Title, Description, Footer (met showCloseButton)."
      >
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>Open Dialog</Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[420px]" showCloseButton>
            <DialogHeader>
              <DialogTitle>Voorbeeld-dialog</DialogTitle>
              <DialogDescription>
                Dit is de standaard Dialog uit components/ui/Dialog.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter showCloseButton>
              <Button onClick={() => setDialogOpen(false)}>Sluiten</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DemoBlock>

      <DemoBlock
        title="AppDrawer"
        path="@/components/ui/AppDrawer"
        description="Zwevend zijpaneel (vaul) voor detail- en aanmaak-flows (taak-detail, nieuwe post). Compose met AppDrawerHeader / AppDrawerMeta / AppDrawerBody / AppDrawerFooter. De lagere-niveau Drawer zit in @/components/ui/Drawer."
      >
        <Button size="sm" variant="outline" onClick={() => setDrawerOpen(true)}>Open AppDrawer</Button>
        <AppDrawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Voorbeeld-drawer" width={420}>
          <AppDrawerHeader>
            <span className="text-[13px] font-medium text-fg-1">Voorbeeld-drawer</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setDrawerOpen(false)} aria-label="Sluiten">
              <SvgIcon name="x" size={15} />
            </Button>
          </AppDrawerHeader>
          <AppDrawerBody>
            <p className="text-[13px] text-fg-2 p-4">Inhoud van de drawer.</p>
          </AppDrawerBody>
        </AppDrawer>
      </DemoBlock>

      <DemoBlock
        title="DropdownMenu"
        path="@/components/ui/DropdownMenu"
        description="Radix-menu met keyboard-navigatie. Gebruik dit voor elk klik-menu (zoals de status-switcher op de projectdetailpagina) — geen handgerolde absolute panelen."
      >
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Open menu
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Acties</DropdownMenuLabel>
            <DropdownMenuItem>
              <SvgIcon name="pencil" size={13} />
              Bewerken
            </DropdownMenuItem>
            <DropdownMenuItem>
              <SvgIcon name="star" size={13} />
              Favoriet
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <SvgIcon name="trash" size={13} />
              Verwijderen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </DemoBlock>

      <DemoBlock
        title="BijlageModal"
        path="@/components/ui/BijlageModal"
        description="Generieke bijlagen-modal (link toevoegen + PDF-upload) met DocumentIcon per type. Entiteit-specifieke server actions komen via props; deze demo gebruikt lokale state."
      >
        <Button size="sm" variant="outline" onClick={() => setBijlageOpen(true)}>Open BijlageModal</Button>
        <BijlageModal
          open={bijlageOpen}
          onOpenChange={setBijlageOpen}
          documents={demoDocs}
          onDocumentsChange={setDemoDocs}
          makeDocument={(base) => base}
          onAddDocument={async () => ({ id: `demo-${demoDocs.length + 1}` })}
          onUploadFile={async () => ({ error: 'Upload is uitgeschakeld in deze demo.' })}
          onDeleteDocument={() => {}}
        />
      </DemoBlock>

      <DemoBlock
        title="Popover"
        path="@/components/ui/popover"
        description="Vrij positioneerbare popup (basis onder DatePicker). Subcomponenten: PopoverHeader, PopoverTitle, PopoverDescription."
      >
        <Popover>
          <PopoverTrigger className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Open popover
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <p className="text-[13px] text-fg-2">Inhoud van de popover.</p>
          </PopoverContent>
        </Popover>
      </DemoBlock>
    </section>
  )
}
