'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { EASE, VariantBar } from './shared'

// ponytail: 3 layouts voor de begeleide onboarding (wachtwoord → profiel). Geen rondleiding.
// De uitgenodigde landt hier via de magic link (/welkom?code=…). Mock: geen echte auth.

type Variant = 'gestapeld' | 'stappen' | 'split'
const INVITED_EMAIL = 'noa@bureau.nl'

function useOnboard() {
  const [pw, setPw] = React.useState('')
  const [pw2, setPw2] = React.useState('')
  const [name, setName] = React.useState('')
  const [done, setDone] = React.useState(false)
  const pwOk = pw.length >= 8 && pw === pw2
  const reset = () => { setPw(''); setPw2(''); setName(''); setDone(false) }
  return { pw, setPw, pw2, setPw2, name, setName, done, setDone, pwOk, reset }
}

function PasswordFields({ s }: { s: ReturnType<typeof useOnboard> }) {
  return (
    <div className="space-y-2.5">
      <Input type="password" value={s.pw} onChange={(e) => s.setPw(e.target.value)} placeholder="Kies een wachtwoord (min. 8 tekens)" autoFocus />
      <Input type="password" value={s.pw2} onChange={(e) => s.setPw2(e.target.value)} placeholder="Herhaal wachtwoord" />
      {s.pw2 && s.pw !== s.pw2 && <p className="text-[12px] text-red-500">Wachtwoorden komen niet overeen</p>}
    </div>
  )
}

function ProfileFields({ s }: { s: ReturnType<typeof useOnboard> }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Avatar name={s.name || INVITED_EMAIL} size={48} />
        <span className="absolute -right-1 -bottom-1 grid size-5 place-content-center rounded-full border border-border-subtle bg-bg-2 text-fg-3"><SvgIcon name="image-square" size={11} /></span>
      </div>
      <div className="flex-1">
        <Input value={s.name} onChange={(e) => s.setName(e.target.value)} placeholder="Volledige naam" />
      </div>
    </div>
  )
}

function DoneCard({ name, onReset }: { name: string; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center animate-in fade-in zoom-in-95 duration-300">
      <span className="grid size-12 place-content-center rounded-full bg-green-500/15 text-green-500"><SvgIcon name="check" size={24} /></span>
      <div>
        <p className="text-[15px] font-medium text-fg-1">Welkom{name ? `, ${name.split(' ')[0]}` : ''}!</p>
        <p className="mt-1 text-[13px] text-fg-2">Je account staat klaar.</p>
      </div>
      <Button size="sm">Naar dashboard</Button>
      <button onClick={onReset} className="text-[12px] text-fg-3 hover:text-fg-1">↺ Opnieuw bekijken</button>
    </div>
  )
}

// 1. Gestapeld: beide stappen onder elkaar op één scherm.
function Gestapeld() {
  const s = useOnboard()
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-xl border border-border-subtle bg-bg-2 p-6">
        {s.done ? <DoneCard name={s.name} onReset={s.reset} /> : (
          <>
            <h2 className="text-[16px] font-medium text-fg-1">Stel je account in</h2>
            <p className="mt-1 mb-5 text-[13px] text-fg-2">Uitgenodigd als <span className="text-fg-1">{INVITED_EMAIL}</span>.</p>
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[12px] font-medium text-fg-2">1 · Wachtwoord</p>
                <PasswordFields s={s} />
              </div>
              <div className={cn('transition-opacity', s.pwOk ? 'opacity-100' : 'pointer-events-none opacity-40')}>
                <p className="mb-2 text-[12px] font-medium text-fg-2">2 · Profiel</p>
                <ProfileFields s={s} />
              </div>
            </div>
            <Button className="mt-6 w-full" disabled={!s.pwOk || !s.name.trim()} onClick={() => s.setDone(true)}>Account aanmaken</Button>
          </>
        )}
      </div>
    </div>
  )
}

// 2. Stappen: één stap tegelijk met voortgang.
function Stappen() {
  const s = useOnboard()
  const [step, setStep] = React.useState(0)
  const reset = () => { s.reset(); setStep(0) }
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-xl border border-border-subtle bg-bg-2 p-6">
        {s.done ? <DoneCard name={s.name} onReset={reset} /> : (
          <>
            <div className="mb-5 flex items-center gap-2">
              {[0, 1].map((i) => (
                <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', EASE, i <= step ? 'bg-fg-1' : 'bg-bg-3')} />
              ))}
            </div>
            {step === 0 ? (
              <>
                <h2 className="text-[16px] font-medium text-fg-1">Kies een wachtwoord</h2>
                <p className="mt-1 mb-5 text-[13px] text-fg-2">Voor <span className="text-fg-1">{INVITED_EMAIL}</span>.</p>
                <PasswordFields s={s} />
                <Button className="mt-6 w-full" disabled={!s.pwOk} onClick={() => setStep(1)}>Volgende</Button>
              </>
            ) : (
              <>
                <h2 className="text-[16px] font-medium text-fg-1">Vertel wie je bent</h2>
                <p className="mt-1 mb-5 text-[13px] text-fg-2">Zo herkennen collega's je.</p>
                <ProfileFields s={s} />
                <div className="mt-6 flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(0)}><SvgIcon name="arrow-left" size={14} /> Terug</Button>
                  <Button className="flex-1" disabled={!s.name.trim()} onClick={() => s.setDone(true)}>Klaar</Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// 3. Split: merk-paneel links, formulier (stappen) rechts.
function Split() {
  const s = useOnboard()
  const [step, setStep] = React.useState(0)
  const reset = () => { s.reset(); setStep(0) }
  return (
    <div className="mx-auto grid w-full max-w-3xl overflow-hidden rounded-xl border border-border-subtle md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-bg-0 p-7 md:flex">
        <div className="flex items-center gap-2 text-fg-1">
          <span className="grid size-7 place-content-center rounded-md bg-yellow-400 text-black"><SvgIcon name="bolt" size={15} /></span>
          <span className="text-[14px] font-medium">Flits Impact CRM</span>
        </div>
        <div>
          <p className="text-[18px] font-medium leading-snug text-fg-1">Je bent uitgenodigd door Jordi.</p>
          <p className="mt-2 text-[13px] text-fg-2">Nog twee korte stapjes en je werkt mee aan klanten, content en projecten.</p>
        </div>
        <p className="text-[12px] text-fg-3">{INVITED_EMAIL}</p>
      </div>
      <div className="bg-bg-2 p-7">
        {s.done ? <DoneCard name={s.name} onReset={reset} /> : step === 0 ? (
          <>
            <h2 className="text-[16px] font-medium text-fg-1">Kies een wachtwoord</h2>
            <p className="mt-1 mb-5 text-[13px] text-fg-2">Stap 1 van 2</p>
            <PasswordFields s={s} />
            <Button className="mt-6 w-full" disabled={!s.pwOk} onClick={() => setStep(1)}>Volgende</Button>
          </>
        ) : (
          <>
            <h2 className="text-[16px] font-medium text-fg-1">Je profiel</h2>
            <p className="mt-1 mb-5 text-[13px] text-fg-2">Stap 2 van 2</p>
            <ProfileFields s={s} />
            <div className="mt-6 flex gap-2">
              <Button variant="ghost" onClick={() => setStep(0)}><SvgIcon name="arrow-left" size={14} /> Terug</Button>
              <Button className="flex-1" disabled={!s.name.trim()} onClick={() => s.setDone(true)}>Klaar</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function Onboarding() {
  const [v, setV] = React.useState<Variant>('gestapeld')
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-center">
        <VariantBar
          value={v}
          onChange={setV}
          options={[{ value: 'gestapeld', label: 'Gestapeld' }, { value: 'stappen', label: 'Stappen' }, { value: 'split', label: 'Split-screen' }]}
        />
      </div>
      <div className="flex-1">
        {v === 'gestapeld' && <Gestapeld />}
        {v === 'stappen' && <Stappen />}
        {v === 'split' && <Split />}
      </div>
    </div>
  )
}
