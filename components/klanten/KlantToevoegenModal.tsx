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
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { createKlant } from '@/app/(app)/klanten/actions'

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
          {/* Naam */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="naam">
              Klantnaam <span className="text-destructive">*</span>
            </Label>
            <Input
              id="naam"
              name="naam"
              required
              placeholder="bijv. JHL Automotive"
            />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">
              Type <span className="text-destructive">*</span>
            </Label>
            <Select name="type" defaultValue="recurring">
              <SelectTrigger id="type" className="w-full">
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

          {/* Contactpersoon */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactpersoon">Contactpersoon</Label>
            <Input
              id="contactpersoon"
              name="contactpersoon"
              placeholder="Naam contactpersoon"
            />
          </div>

          {/* Email + Telefoon */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="naam@domein.nl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="telefoon">Telefoon</Label>
              <Input id="telefoon" name="telefoon" placeholder="06 12345678" />
            </div>
          </div>

          {/* Volgende factuur */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="volgende_factuur">Volgende factuur</Label>
            <Input id="volgende_factuur" name="volgende_factuur" type="date" />
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
