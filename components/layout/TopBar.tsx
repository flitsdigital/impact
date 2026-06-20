"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SvgIcon } from "@/components/ui/SvgIcon"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu"
import { createClient } from "@/lib/supabase/client"
import { Avatar } from "@/components/ui/Avatar"
import { ProfielDrawer } from "@/components/profiel/ProfielDrawer"
import { useAuthStore } from "@/store/auth"
import { useTakenStore } from "@/store/taken"

export function TopBar() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const [profielOpen, setProfielOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? "Gebruiker"
  const avatarUrl = user?.user_metadata?.avatar_url ?? null

  return (
    <header className="h-[var(--topbar-h)] border-b border-border-subtle bg-bg-0 grid grid-cols-[1fr_auto_1fr] items-center pr-4 pl-5 sticky top-0 z-40">
      {/* Left — brand mark */}
      <div className="flex items-center gap-[7px] min-w-0">
        <span className="fl-bolt">
          <SvgIcon name="bolt" size={12} className="text-[var(--brand-yellow)]" />
        </span>
        <span className="text-[13px] font-medium text-fg-1 whitespace-nowrap">Flits Impact CRM</span>
      </div>

      {/* Center — search pill (verborgen op telefoon, vervangen door icoon rechts).
          Wrapper-div regelt zichtbaarheid; .fl-search forceert zelf display:inline-flex. */}
      <div className="hidden md:flex justify-center">
        <button
          type="button"
          className="fl-search w-[272px] justify-start border-none"
          onClick={() => setSearchOpen(true)}
          aria-label="Zoeken"
        >
          <SvgIcon name="magnifying-glass" size={13} className="text-fg-2 shrink-0" />
          <span className="text-[12px] text-fg-2">Zoeken</span>
          <span className="ml-auto flex items-center gap-1">
            <span className="fl-kbd text-[11px]">⌘</span>
            <span className="fl-kbd text-[11px]">K</span>
          </span>
        </button>
      </div>

      {/* Right — user menu. col-start-3 houdt 'm in de laatste kolom, ook als
          de verborgen zoek-kolom op telefoon wegvalt (anders schuift 'm naar 't midden). */}
      <div className="flex items-center justify-end gap-1 col-start-3">
        {/* Zoek-icoon — alleen telefoon */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Zoeken"
          className="md:hidden flex items-center justify-center size-[28px] rounded-md border-none bg-transparent cursor-pointer text-fg-2 transition-colors hover:bg-bg-3 hover:text-fg-1"
        >
          <SvgIcon name="magnifying-glass" size={16} />
        </button>
        <button
          type="button"
          onClick={() => void useTakenStore.getState().openDrawer()}
          aria-label="Mijn taken (⌘⇧T)"
          title="Mijn taken (⌘⇧T)"
          className="flex items-center justify-center size-[28px] rounded-md border-none bg-transparent cursor-pointer text-fg-2 transition-colors hover:bg-bg-3 hover:text-fg-1"
        >
          <SvgIcon name="list-check" size={16} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-1.5 rounded-md px-1.5 py-1 border-none bg-transparent cursor-pointer text-fg-2 transition-colors hover:bg-bg-3">
              <Avatar src={avatarUrl} name={displayName} size={22} />
              <SvgIcon name="chevron-down" size={10} className="text-fg-2" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <div className="px-2.5 py-2 border-b border-border-subtle mb-1">
              <p className="m-0 text-[13px] font-medium text-fg-1">{displayName}</p>
              <p className="m-0 mt-0.5 text-[12px] text-fg-3">{user?.email}</p>
            </div>

            <DropdownMenuItem onSelect={() => setProfielOpen(true)}>
              <SvgIcon name="user" size={14} />
              Profiel
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={handleSignOut} className="text-orange-500 focus:text-orange-500">
              <SvgIcon name="log-out" size={14} />
              Uitloggen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ProfielDrawer open={profielOpen} onOpenChange={setProfielOpen} />
    </header>
  )
}
