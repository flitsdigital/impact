'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusChip } from '@/components/ui/StatusChip'
import { EmptyState } from '@/components/ui/EmptyState'
import { DatePicker } from '@/components/ui/DatePicker'
import { PillSelect } from '@/components/ui/PillSelect'
import { LevelSelect } from '@/components/ui/LevelSelect'
import { LevelBadge } from '@/components/ui/LevelBadge'
import { RolePill } from '@/components/ui/RolePill'
import { Stepper } from '@/components/ui/Stepper'
import { LEVELS, ROLE_IDS, type Level, type RoleId } from '@/lib/permissions'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { KANBAN_COLUMNS, PROJECT_COLUMNS } from '@/types/project'
import { DemoBlock, SectionHeading } from './DemoBlock'

const BUTTON_VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const
const BADGE_VARIANTS = ['default', 'secondary', 'outline', 'destructive'] as const

const DEMO_PEOPLE = [
  { key: '1', name: 'Jordi Klavers' },
  { key: '2', name: 'Anna Bakker' },
  { key: '3', name: 'Tim de Vries' },
  { key: '4', name: 'Sanne Visser' },
  { key: '5', name: 'Mark Jansen' },
]

export function AtomsSection() {
  const [segmented, setSegmented] = useState<'kanban' | 'gantt' | 'lijst'>('kanban')
  const [search, setSearch] = useState('')
  const [checked, setChecked] = useState(true)
  const [selectValue, setSelectValue] = useState('all')
  const [pillValue, setPillValue] = useState('foto')
  const [date, setDate] = useState('2026-06-11')
  const [level, setLevel] = useState<Level>(2)
  const [role, setRole] = useState<RoleId>('lid')
  const [step, setStep] = useState(1)

  return (
    <section className="flex flex-col gap-8">
      <SectionHeading
        id="atomen"
        title="Atomen"
        intro="De bouwstenen uit components/ui/. Gebruik altijd eerst een bestaand atoom voordat je markup met de hand bouwt — en check deze pagina vóór je een nieuw component maakt."
      />

      <DemoBlock
        title="Button"
        path="@/components/ui/Button"
        description="Varianten: default · secondary · outline · ghost · destructive · link. Maten: xs · sm · default · lg + icon-xs · icon-sm · icon · icon-lg."
        className="flex-col items-start"
      >
        <div className="flex flex-wrap items-center gap-2">
          {BUTTON_VARIANTS.map((v) => (
            <Button key={v} variant={v} size="sm">{v}</Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">xs</Button>
          <Button size="sm">sm</Button>
          <Button>default</Button>
          <Button size="lg">lg</Button>
          <Button size="icon-sm" variant="ghost" aria-label="Icon-knop">
            <SvgIcon name="plus" size={14} />
          </Button>
          <Button size="sm" className="gap-1.5">
            <SvgIcon name="file-plus" size={13} />
            Met icoon
          </Button>
          <Button size="sm" disabled>Disabled</Button>
        </div>
      </DemoBlock>

      <DemoBlock
        title="Badge"
        path="@/components/ui/Badge"
        description="Kleine status- of teller-chip. Voor klant- en factuurstatussen bestaan domein-badges (zie sectie Domein)."
      >
        {BADGE_VARIANTS.map((v) => (
          <Badge key={v} variant={v}>{v}</Badge>
        ))}
        <Badge variant="secondary" className="rounded-full">3</Badge>
      </DemoBlock>

      <DemoBlock
        title="StatusChip"
        path="@/components/ui/StatusChip"
        description="Icoon + label in de statuskleur. Werkt met elke config die { iconName, label, textClass } levert (KANBAN_COLUMNS, PROJECT_COLUMNS, content-statussen). Tekstgrootte erft via className."
        className="flex-col items-start"
      >
        <div className="flex flex-wrap gap-4">
          {KANBAN_COLUMNS.map((c) => (
            <StatusChip key={c.status} iconName={c.iconName} label={c.label} textClass={c.textClass} className="text-[12px]" />
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {PROJECT_COLUMNS.map((c) => (
            <StatusChip key={c.status} iconName={c.iconName} label={c.label} textClass={c.textClass} className="text-[12px]" />
          ))}
        </div>
      </DemoBlock>

      <DemoBlock
        title="SegmentedControl"
        path="@/components/ui/SegmentedControl"
        description="Dé view/filter-switcher (pill met Button ghost xs). Gebruik deze voor elke 'kies één van N'-toolbar — geen eigen pill-rows meer bouwen."
      >
        <SegmentedControl
          options={[
            { value: 'kanban', label: 'Kanban', icon: 'chart-kanban' },
            { value: 'gantt', label: 'Gantt', icon: 'chart-gantt' },
            { value: 'lijst', label: 'Lijst', icon: 'list-check' },
          ]}
          value={segmented}
          onChange={setSegmented}
        />
        <SegmentedControl
          options={[
            { value: 'kanban', label: 'Alle' },
            { value: 'gantt', label: 'Recurring' },
            { value: 'lijst', label: 'One-off' },
          ]}
          value={segmented}
          onChange={setSegmented}
        />
      </DemoBlock>

      <DemoBlock
        title="SearchInput"
        path="@/components/ui/SearchInput"
        description="De standaard zoek-pill voor PageHeader-acties en filtertoolbars. Breedte/achtergrond via className aanpasbaar (zie AssigneesModal)."
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Zoek een project..." />
      </DemoBlock>

      <DemoBlock
        title="Input · Textarea · Label · Checkbox"
        path="@/components/ui/{Input,Textarea,Label,Checkbox}"
        description="Formulier-basis. Borderless inline-editors (titelvelden in drawers) blijven bewust raw — zie DESIGN-SYSTEM.md."
        className="flex-col items-start"
      >
        <div className="flex flex-col gap-1.5 w-72">
          <Label htmlFor="ds-input">Klantnaam <span className="text-destructive">*</span></Label>
          <Input id="ds-input" placeholder="bijv. JHL Automotive" />
        </div>
        <div className="flex flex-col gap-1.5 w-72">
          <Label htmlFor="ds-textarea">Notities</Label>
          <Textarea id="ds-textarea" placeholder="Interne notities..." />
        </div>
        <Label className="cursor-pointer">
          <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
          Checkbox met label
        </Label>
      </DemoBlock>

      <DemoBlock
        title="Select"
        path="@/components/ui/Select"
        description="Base-ui select met portal-popup. In een vaul-Drawer/Dialog heeft de popup pointer-events-auto nodig (zit al in de Content-styling)."
      >
        <Select value={selectValue} onValueChange={(v) => setSelectValue(v ?? 'all')}>
          <SelectTrigger size="sm" className="text-[12px] w-44" aria-label="Demo select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Alle projecten</SelectItem>
              <SelectItem value="a">Project A</SelectItem>
              <SelectItem value="b">Project B</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </DemoBlock>

      <DemoBlock
        title="PillSelect"
        path="@/components/ui/PillSelect"
        description="Native select met twee looks: pill (compact, inline) en input (volle breedte, als het Input-atoom). OS-gerenderd menu, dus altijd veilig binnen Drawers/Dialogs."
      >
        <div className="flex w-full flex-col gap-3">
          <PillSelect value={pillValue} onChange={setPillValue} icon="image-square">
            <option value="foto">Foto</option>
            <option value="video">Video</option>
            <option value="reel">Reel</option>
          </PillSelect>
          <PillSelect variant="input" value={pillValue} onChange={setPillValue}>
            <option value="foto">Foto</option>
            <option value="video">Video</option>
            <option value="reel">Reel</option>
          </PillSelect>
        </div>
      </DemoBlock>

      <DemoBlock
        title="DatePicker"
        path="@/components/ui/DatePicker"
        description='Kalender-popover met "YYYY-MM-DD"-waarde. variant="field" (als Input) of variant="pill" (compacte chip); name-prop voor FormData-submits.'
      >
        <DatePicker value={date} onChange={setDate} aria-label="Demo datum (veld)" />
        <DatePicker value={date} onChange={setDate} variant="pill" aria-label="Demo datum (pill)" />
      </DemoBlock>

      <DemoBlock
        title="Avatar · AvatarStack"
        path="@/components/ui/{Avatar,AvatarStack}"
        description="Avatar toont initialen als er geen src is. AvatarStack stapelt met overlap en een +N-bolletje; size/overlap/ringClass per context, showOverflow={false} als de caller zelf telt."
      >
        <Avatar name="Jordi Klavers" size={24} />
        <Avatar name="Anna Bakker" size={20} />
        <AvatarStack people={DEMO_PEOPLE} size={20} overlap={6} />
        <AvatarStack people={DEMO_PEOPLE} size={14} overlap={1.4} />
      </DemoBlock>

      <DemoBlock
        title="EmptyState"
        path="@/components/ui/EmptyState"
        description="Gedeelde lege staat: icoon + titel + optionele beschrijving en CTA."
        className="h-56"
      >
        <EmptyState
          icon="chart-kanban"
          title="Nog geen projecten"
          description="Maak je eerste project aan om te beginnen."
          action={
            <Button size="sm" className="gap-1.5 mt-2">
              <SvgIcon name="file-plus" size={13} />
              Nieuw project
            </Button>
          }
        />
      </DemoBlock>

      <DemoBlock
        title="Card"
        path="@/components/ui/Card"
        description="Paneel voor detailpagina's (zie klant-detail). Subcomponenten: CardHeader, CardTitle, CardDescription, CardContent, CardFooter."
      >
        <Card className="w-80">
          <CardHeader>
            <CardTitle>Contactgegevens</CardTitle>
            <CardDescription>Voorbeeld van een Card.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-2">Inhoud van de kaart.</p>
          </CardContent>
        </Card>
      </DemoBlock>

      <DemoBlock
        title="Table"
        path="@/components/ui/Table"
        description="Tabel-subcomponenten (thead/tbody/rows/cells). Voor takenlijsten bestaat al een complete tabel: TakenLijst (zie Domein)."
        className="p-0 overflow-hidden"
      >
        <table className="w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Naam</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="pl-4">JHL Automotive</TableCell>
              <TableCell>Recurring</TableCell>
              <TableCell>Actief</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-4">Bakkerij Visser</TableCell>
              <TableCell>Project</TableCell>
              <TableCell>Gepauzeerd</TableCell>
            </TableRow>
          </TableBody>
        </table>
      </DemoBlock>

      <DemoBlock
        title="LevelSelect · LevelBadge"
        path="@/components/ui/{LevelSelect,LevelBadge}"
        description="Rechten-niveau per feature (Geen · Bekijken · Bewerken · Beheren). LevelSelect kiest, LevelBadge toont. Voeding via lib/permissions (LEVELS)."
        className="flex-col items-start"
      >
        <LevelSelect value={level} onChange={setLevel} showLabels />
        <div className="flex flex-wrap items-center gap-2">
          {LEVELS.map((l) => (
            <LevelBadge key={l.value} level={l.value} />
          ))}
        </div>
      </DemoBlock>

      <DemoBlock
        title="RolePill"
        path="@/components/ui/RolePill"
        description="Rol-chip met gekleurde dot. Klikbaar (selecteerbaar via onClick) of puur informatief. Kleur/naam uit ROLE_META in lib/permissions."
      >
        {ROLE_IDS.map((r) => (
          <RolePill key={r} role={r} active={role === r} onClick={() => setRole(r)} />
        ))}
      </DemoBlock>

      <DemoBlock
        title="Stepper"
        path="@/components/ui/Stepper"
        description="Voortgangsindicator voor wizards. Voltooide stappen krijgen een vinkje; eerdere stappen zijn klikbaar via onJump."
        className="flex-col items-start"
      >
        <div className="w-full max-w-md">
          <Stepper
            steps={[
              { id: 'email', label: 'E-mailadres' },
              { id: 'rol', label: 'Rol' },
              { id: 'fijn', label: 'Fijn-afstemmen' },
            ]}
            current={step}
            onJump={setStep}
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))}>Terug</Button>
          <Button size="sm" onClick={() => setStep((s) => Math.min(2, s + 1))}>Volgende</Button>
        </div>
      </DemoBlock>
    </section>
  )
}
