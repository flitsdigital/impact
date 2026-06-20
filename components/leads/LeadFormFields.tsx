import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { PillSelect } from '@/components/ui/PillSelect'
import type { Lead, LeadBron, LeadDienst } from '@/types/lead'
import { BRON_LABEL, DIENST_CONFIG } from '@/types/lead'

/**
 * Gedeelde veldenset van het lead-formulier (NieuweLeadDrawer + bewerken-dialog).
 * Uncontrolled (name-based) zodat beide via FormData kunnen submitten.
 */
interface LeadFormFieldsProps {
  /** Bestaande lead voor defaultValues (bewerken); leeg bij aanmaken */
  lead?: Lead
  /** Prefix voor element-ids zodat meerdere instanties niet botsen */
  idPrefix?: string
}

export function LeadFormFields({ lead, idPrefix = '' }: LeadFormFieldsProps) {
  const id = (name: string) => `${idPrefix}${name}`

  return (
    <>
      {/* Bedrijfsnaam */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id('bedrijfsnaam')}>
          Bedrijfsnaam <span className="text-destructive">*</span>
        </Label>
        <Input
          id={id('bedrijfsnaam')}
          name="bedrijfsnaam"
          required
          defaultValue={lead?.bedrijfsnaam}
          placeholder={lead ? undefined : 'bijv. Bakkerij Visser'}
          data-vaul-no-drag
        />
      </div>

      {/* Contactpersoon */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id('contactpersoon')}>Contactpersoon</Label>
        <Input
          id={id('contactpersoon')}
          name="contactpersoon"
          defaultValue={lead?.contactpersoon ?? ''}
          placeholder="Naam contactpersoon"
          data-vaul-no-drag
        />
      </div>

      {/* Email + Telefoon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id('email')}>Email</Label>
          <Input
            id={id('email')}
            name="email"
            type="email"
            defaultValue={lead?.email ?? ''}
            placeholder="naam@domein.nl"
            data-vaul-no-drag
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id('telefoon')}>Telefoon</Label>
          <Input
            id={id('telefoon')}
            name="telefoon"
            defaultValue={lead?.telefoon ?? ''}
            placeholder="06 12345678"
            data-vaul-no-drag
          />
        </div>
      </div>

      {/* Bron + Waarde */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id('bron')}>Bron</Label>
          {/* PillSelect variant=input: native select, werkt betrouwbaar in de Drawer */}
          <PillSelect id={id('bron')} name="bron" variant="input" defaultValue={lead?.bron ?? 'overig'}>
            {(Object.keys(BRON_LABEL) as LeadBron[]).map((b) => (
              <option key={b} value={b}>{BRON_LABEL[b]}</option>
            ))}
          </PillSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id('waarde')}>Geschatte waarde (€)</Label>
          <Input
            id={id('waarde')}
            name="waarde"
            type="number"
            min="0"
            step="50"
            defaultValue={lead?.waarde ?? ''}
            placeholder="bijv. 2500"
            data-vaul-no-drag
          />
        </div>
      </div>

      {/* Dienst */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id('dienst')}>Dienst</Label>
        <PillSelect id={id('dienst')} name="dienst" variant="input" defaultValue={lead?.dienst ?? ''}>
          <option value="">Geen dienst</option>
          {(Object.keys(DIENST_CONFIG) as LeadDienst[]).map((d) => (
            <option key={d} value={d}>{DIENST_CONFIG[d].label}</option>
          ))}
        </PillSelect>
      </div>

      {/* Notities */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id('notities')}>Notities</Label>
        <Textarea
          id={id('notities')}
          name="notities"
          defaultValue={lead?.notities ?? ''}
          placeholder="Interne notities over deze lead..."
          data-vaul-no-drag
        />
      </div>
    </>
  )
}
