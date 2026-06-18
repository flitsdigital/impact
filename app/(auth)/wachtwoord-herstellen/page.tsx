"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SvgIcon } from "@/components/ui/SvgIcon"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"

type Phase = "checking" | "ready" | "invalid" | "saving"

export default function WachtwoordHerstellenPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("checking")
  const [password, setPassword] = useState("")

  // Supabase stuurt de herstellink hierheen met ?code=… (PKCE). Wissel die in
  // voor een sessie; geen/ongeldige code → link verlopen.
  useEffect(() => {
    const supabase = createClient()
    const code = new URLSearchParams(window.location.search).get("code")
    if (!code) {
      supabase.auth.getSession().then(({ data }) =>
        setPhase(data.session ? "ready" : "invalid"),
      )
      return
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) =>
      setPhase(error ? "invalid" : "ready"),
    )
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPhase("saving")

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error(error.message)
      setPhase("ready")
      return
    }

    toast.success("Wachtwoord gewijzigd")
    router.push("/dashboard")
    router.refresh()
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
          {phase === "invalid" ? "Link verlopen" : "Nieuw wachtwoord"}
        </h1>
      </div>

      {phase === "checking" ? (
        <p className="text-sm leading-[1.5] tracking-[-0.14px] text-fg-2">
          Herstellink controleren…
        </p>
      ) : phase === "invalid" ? (
        <div className="flex flex-col gap-[25px]">
          <p className="text-sm leading-[1.5] tracking-[-0.14px] text-fg-2">
            Deze herstellink is ongeldig of verlopen. Vraag een nieuwe aan.
          </p>
          <Link
            href="/wachtwoord-vergeten"
            className="flex h-10 w-full items-center justify-center rounded-sm border border-border-subtle bg-bg-2 text-sm font-medium tracking-[-0.14px] text-fg-1 transition-colors hover:bg-bg-3"
          >
            Nieuwe herstellink aanvragen
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-[25px]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-sm tracking-[-0.14px] text-fg-2">
              Nieuw wachtwoord
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 rounded-sm border-transparent bg-bg-2 px-3 text-sm text-fg-1"
            />
          </div>

          <Button
            type="submit"
            disabled={phase === "saving"}
            className="h-10 w-full rounded-sm bg-white text-sm font-medium tracking-[-0.14px] text-bg-0 hover:bg-white/90"
          >
            {phase === "saving" ? "Opslaan…" : "Wachtwoord opslaan"}
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
