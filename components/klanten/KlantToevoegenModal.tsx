'use client'

import { useActionState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Label } from '@/components/ui/Label'
import { createKlant } from '@/app/(app)/klanten/actions'
import { KlantFormFields } from './KlantFormFields'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const INITIAL: { error?: string; success?: boolean } | null = null

export function KlantToevoegenModal({ open, onOpenChange }: Props) {
  const [state, action, pending] = useActionState(createKlant, INITIAL)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      onOpenChange(false)
      formRef.current?.reset()
    }
  }, [state?.success, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]" showCloseButton>
        <DialogHeader>
          <DialogTitle>Klant toevoegen</DialogTitle>
        </DialogHeader>

        <form ref={formRef} action={action} className="flex flex-col gap-4 py-2">
          <KlantFormFields />

          {/* Volgende factuur */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="volgende_factuur">Volgende factuur</Label>
            <DatePicker id="volgende_factuur" name="volgende_factuur" placeholder="Kies datum" />
          </div>

          {state?.error && (
            <p className="text-xs text-destructive">{state.error}</p>
          )}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending} variant="default">
              {pending ? 'Bezig...' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
