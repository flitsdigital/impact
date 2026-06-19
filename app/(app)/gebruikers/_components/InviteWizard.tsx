'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Stepper } from '@/components/ui/Stepper'
import { LevelBadge } from '@/components/ui/LevelBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import {
  FEATURES, ROLE_IDS, roleMeta,
  type FeatureId, type RoleId,
} from '@/lib/permissions'
import type { RolePermsMap } from './types'

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
const STEPS = [
  { id: 'email', label: 'E-mailadres' },
  { id: 'rol', label: 'Rol' },
  { id: 'controle', label: 'Controleren' },
]

export function InviteWizard({
  open, onOpenChange, rolePerms, onInvite,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rolePerms: RolePermsMap
  onInvite: (email: string, role: RoleId) => Promise<void>
}) {
  const [step, setStep] = React.useState(0)
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<RoleId>('lid')
  const [sending, setSending] = React.useState(false)

  const emailOk = isEmail(email)
  const perms = rolePerms[role]

  const send = async () => {
    setSending(true)
    try {
      await onInvite(email.trim().toLowerCase(), role)
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Versturen mislukt')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Teamlid uitnodigen</DialogTitle>
        </DialogHeader>

        <Stepper steps={STEPS} current={step} onJump={setStep} className="mb-5" />

        {step === 0 && (
          <div className="space-y-2">
            <p className="text-[13px] text-fg-2">Naar welk e-mailadres sturen we de uitnodiging?</p>
            <Input
              type="email"
              value={email}
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && emailOk) setStep(1) }}
              placeholder="naam@bedrijf.nl"
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2">
            <p className="text-[13px] text-fg-2">Welke rol krijgt deze persoon?</p>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_IDS.map((r) => {
                const m = roleMeta(r)
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors ease-strong duration-200 ${role === r ? 'border-border-strong bg-bg-2' : 'border-border-subtle hover:bg-bg-2'}`}
                  >
                    <span className="flex items-center gap-1.5 text-[13px] text-fg-1">
                      <span className={`size-1.5 rounded-full ${m.tint.replace('text-', 'bg-')}`} />
                      {m.name}
                    </span>
                    <span className="text-[11px] text-fg-3">{m.description}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-1 px-3 py-2 text-[13px]">
              <span className="text-fg-2">Uitnodigen</span>
              <span className="text-fg-1">{email}</span>
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-fg-2">Krijgt als <span className="text-fg-1">{roleMeta(role).name}</span> toegang tot</p>
              <div className="max-h-56 space-y-1 overflow-auto rounded-lg border border-border-subtle bg-bg-1 p-2">
                {FEATURES.filter((f) => perms[f.id as FeatureId] > 0).map((f) => (
                  <div key={f.id} className="flex items-center gap-2 px-1 py-0.5 text-[13px] text-fg-1">
                    <SvgIcon name={f.icon} size={14} className="text-fg-3" />
                    <span className="flex-1">{f.label}</span>
                    <LevelBadge level={perms[f.id as FeatureId]} />
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-fg-3">Na uitnodigen kun je per persoon uitzonderingen instellen.</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}>
            {step === 0 ? 'Annuleer' : <><SvgIcon name="arrow-left" size={14} /> Terug</>}
          </Button>
          {step < 2 ? (
            <Button size="sm" disabled={step === 0 && !emailOk} onClick={() => setStep(step + 1)}>
              Volgende
            </Button>
          ) : (
            <Button size="sm" disabled={sending} onClick={send}>
              {sending ? <><SvgIcon name="circle-notch" size={14} className="animate-spin" /> Versturen…</> : <><SvgIcon name="user-plus" size={14} /> Verstuur uitnodiging</>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
