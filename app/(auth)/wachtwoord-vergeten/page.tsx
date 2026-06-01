"use client"

import { useState } from "react"
import Link from "next/link"
import { SvgIcon } from "@/components/ui/SvgIcon"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"

export default function WachtwoordVergetenPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/wachtwoord-herstellen`,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <>
      {/* Merk + kop */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-[7px]">
          <span className="fl-bolt">
            <SvgIcon name="bolt" size={14} className="text-[var(--brand-yellow)]" />
          </span>
          <span className="text-[13px] font-medium tracking-[-0.13px] text-fg-1">
            Flits Impact CRM
          </span>
        </div>
        <h1 className="text-[52px] font-medium leading-[1.3] tracking-[-0.52px] text-fg-1">
          {sent ? "Check je inbox" : "Wachtwoord vergeten"}
        </h1>
      </div>

      {sent ? (
        /* Bevestiging */
        <div className="flex flex-col gap-[25px]">
          <p className="text-sm leading-[1.5] tracking-[-0.14px] text-fg-2">
            We hebben een herstellink gestuurd naar{" "}
            <span className="text-fg-1">{email}</span>. Volg de link in de e-mail
            om een nieuw wachtwoord in te stellen.
          </p>
          <Link
            href="/login"
            className="flex h-10 w-full items-center justify-center rounded-sm border border-border-subtle bg-bg-2 text-sm font-medium tracking-[-0.14px] text-fg-1 transition-colors hover:bg-bg-3"
          >
            Terug naar inloggen
          </Link>
        </div>
      ) : (
        /* Formulier */
        <form onSubmit={handleSubmit} className="flex flex-col gap-[25px]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-sm tracking-[-0.14px] text-fg-2">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-sm border-transparent bg-bg-2 px-3 text-sm text-fg-1"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-10 w-full rounded-sm bg-white text-sm font-medium tracking-[-0.14px] text-bg-0 hover:bg-white/90"
          >
            {loading ? "Versturen…" : "Verstuur herstellink"}
          </Button>

          <Link
            href="/login"
            className="text-center text-sm font-medium tracking-[-0.14px] text-fg-2 underline underline-offset-2 transition-colors hover:text-fg-1"
          >
            Terug naar inloggen
          </Link>
        </form>
      )}
    </>
  )
}
