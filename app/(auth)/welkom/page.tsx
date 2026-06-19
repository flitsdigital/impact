"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SvgIcon } from "@/components/ui/SvgIcon"
import { Avatar } from "@/components/ui/Avatar"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { cn } from "@/lib/utils"

type Phase = "checking" | "ready" | "invalid" | "saving"

// Onboarding voor uitgenodigde gebruikers (gestapeld). Stap 1 wachtwoord, stap 2 profiel.
// Een invite-link levert de sessie aan in de URL-HASH (#access_token=… — implicit flow;
// Supabase gebruikt geen PKCE voor invites). We vangen ook ?code=… (magic link) op.
export default function WelkomPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("checking")
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const [naam, setNaam] = useState("")

  const pwOk = password.length >= 8 && password === password2

  useEffect(() => {
    const supabase = createClient()

    const afterSession = async () => {
      const { data } = await supabase.auth.getUser()
      setEmail(data.user?.email ?? "")
      setNaam((data.user?.user_metadata?.full_name as string) ?? "")
      setPhase(data.user ? "ready" : "invalid")
    }

    const init = async () => {
      // 1. Invite/recovery via implicit flow → tokens in de URL-hash.
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
      const access_token = hash.get("access_token")
      const refresh_token = hash.get("refresh_token")
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        // Hash uit de URL halen (bevat de tokens).
        window.history.replaceState(null, "", window.location.pathname + window.location.search)
        if (error) return setPhase("invalid")
        return afterSession()
      }

      // 2. PKCE code flow (bv. magic link).
      const code = new URLSearchParams(window.location.search).get("code")
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) return setPhase("invalid")
        return afterSession()
      }

      // 3. Al een sessie?
      return afterSession()
    }

    init()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pwOk || !naam.trim()) return
    setPhase("saving")

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password,
      data: { full_name: naam.trim() },
    })

    if (error) {
      toast.error(error.message)
      setPhase("ready")
      return
    }

    toast.success(`Welkom, ${naam.trim().split(" ")[0]}!`)
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-[7px]">
          <span className="fl-bolt">
            <SvgIcon name="bolt" size={14} className="text-[var(--brand-yellow)]" />
          </span>
          <span className="text-[13px] font-medium tracking-[-0.13px] text-fg-1">Flits Impact CRM</span>
        </div>
        <h1 className="text-[52px] font-medium leading-[1.3] tracking-[-0.52px] text-fg-1">
          {phase === "invalid" ? "Link verlopen" : "Welkom"}
        </h1>
      </div>

      {phase === "checking" ? (
        <p className="text-sm leading-[1.5] tracking-[-0.14px] text-fg-2">Uitnodiging controleren…</p>
      ) : phase === "invalid" ? (
        <div className="flex flex-col gap-[25px]">
          <p className="text-sm leading-[1.5] tracking-[-0.14px] text-fg-2">
            Deze uitnodiging is ongeldig of verlopen. Vraag je beheerder om een nieuwe.
          </p>
          <Link
            href="/login"
            className="flex h-10 w-full items-center justify-center rounded-sm border border-border-subtle bg-bg-2 text-sm font-medium tracking-[-0.14px] text-fg-1 transition-colors hover:bg-bg-3"
          >
            Naar inloggen
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {email && (
            <p className="text-sm leading-[1.5] tracking-[-0.14px] text-fg-2">
              Je account voor <span className="text-fg-1">{email}</span> staat klaar. Nog twee stapjes.
            </p>
          )}

          {/* Stap 1 — wachtwoord */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm tracking-[-0.14px] text-fg-2">1 · Kies een wachtwoord</Label>
            <Input
              type="password"
              autoComplete="new-password"
              autoFocus
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 tekens"
              className="h-10 rounded-sm border-transparent bg-bg-2 px-3 text-sm text-fg-1"
            />
            <Input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="Herhaal wachtwoord"
              className="h-10 rounded-sm border-transparent bg-bg-2 px-3 text-sm text-fg-1"
            />
            {password2 && password !== password2 && (
              <p className="text-[12px] text-red-500">Wachtwoorden komen niet overeen</p>
            )}
          </div>

          {/* Stap 2 — profiel (ontgrendelt zodra wachtwoord geldig is) */}
          <div className={cn("flex flex-col gap-2 transition-opacity", pwOk ? "opacity-100" : "pointer-events-none opacity-40")}>
            <Label className="text-sm tracking-[-0.14px] text-fg-2">2 · Hoe heet je?</Label>
            <div className="flex items-center gap-3">
              <Avatar name={naam || email || "?"} size={44} />
              <Input
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                placeholder="Volledige naam"
                className="h-10 flex-1 rounded-sm border-transparent bg-bg-2 px-3 text-sm text-fg-1"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={phase === "saving" || !pwOk || !naam.trim()}
            className="h-10 w-full rounded-sm bg-white text-sm font-medium tracking-[-0.14px] text-bg-0 hover:bg-white/90"
          >
            {phase === "saving" ? "Account aanmaken…" : "Account aanmaken"}
          </Button>
        </form>
      )}
    </>
  )
}
