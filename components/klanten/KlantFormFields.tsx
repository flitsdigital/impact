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
import type { Klant } from '@/types/klant'

/**
 * Gedeelde veldenset van het klant-formulier (toevoegen + bewerken).
 * Extra velden (status, website, notities, volgende factuur) en de
 * submit-afhandeling blijven bij de aanroepende dialog.
 */
interface KlantFormFieldsProps {
  /** Bestaande klant voor defaultValues (bewerken); leeg bij toevoegen */
  klant?: Klant
  /** Prefix voor element-ids zodat meerdere instanties niet botsen */
  idPrefix?: string
}

export function KlantFormFields({ klant, idPrefix = '' }: KlantFormFieldsProps) {
  const id = (name: string) => `${idPrefix}${name}`

  return (
    <>
      {/* Naam */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id('naam')}>
          Klantnaam <span className="text-destructive">*</span>
        </Label>
        <Input
          id={id('naam')}
          name="naam"
          required
          defaultValue={klant?.naam}
          placeholder={klant ? undefined : 'bijv. JHL Automotive'}
        />
      </div>

      {/* Type */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id('type')}>
          Type {!klant && <span className="text-destructive">*</span>}
        </Label>
        <Select name="type" defaultValue={klant?.type ?? 'recurring'}>
          <SelectTrigger id={id('type')} className="w-full">
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
        <Label htmlFor={id('contactpersoon')}>Contactpersoon</Label>
        <Input
          id={id('contactpersoon')}
          name="contactpersoon"
          defaultValue={klant?.contactpersoon ?? ''}
          placeholder="Naam contactpersoon"
        />
      </div>

      {/* Email + Telefoon */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id('email')}>Email</Label>
          <Input
            id={id('email')}
            name="email"
            type="email"
            defaultValue={klant?.email ?? ''}
            placeholder="naam@domein.nl"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id('telefoon')}>Telefoon</Label>
          <Input
            id={id('telefoon')}
            name="telefoon"
            defaultValue={klant?.telefoon ?? ''}
            placeholder="06 12345678"
          />
        </div>
      </div>
    </>
  )
}
