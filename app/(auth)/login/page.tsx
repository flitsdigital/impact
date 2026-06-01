"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SvgIcon } from "@/components/ui/SvgIcon"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

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
          Welkom
        </h1>
      </div>

      {/* Formulier */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-[25px]">
        {/* E-mail */}
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

        {/* Wachtwoord */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm tracking-[-0.14px] text-fg-2">
              Wachtwoord
            </Label>
            <Link
              href="/wachtwoord-vergeten"
              className="text-sm font-medium tracking-[-0.14px] text-fg-2 underline underline-offset-2 transition-colors hover:text-fg-1"
            >
              Wachtwoord vergeten?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 rounded-sm border-transparent bg-bg-2 px-3 text-sm text-fg-1"
          />
        </div>

        {/* Inloggen */}
        <Button
          type="submit"
          disabled={loading}
          className="h-10 w-full rounded-sm bg-white text-sm font-medium tracking-[-0.14px] text-bg-0 hover:bg-white/90"
        >
          {loading ? "Inloggen…" : "Inloggen"}
        </Button>
      </form>
    </>
  )
}
