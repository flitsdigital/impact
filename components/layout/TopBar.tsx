"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, ChevronDown, LogOut, User, Zap } from "lucide-react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { Avatar } from "@/components/ui/Avatar"
import { useAuthStore } from "@/store/auth"

export function TopBar() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [searchOpen, setSearchOpen] = useState(false)

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
      <div className="flex items-center gap-[7px]">
        <span className="fl-bolt">
          <Zap size={12} fill="var(--brand-yellow)" color="var(--brand-yellow)" />
        </span>
        <span className="text-[13px] font-medium text-fg-1">Flits Impact CRM</span>
      </div>

      {/* Center — search pill */}
      <button
        type="button"
        className="fl-search w-[272px] justify-start border-none"
        onClick={() => setSearchOpen(true)}
        aria-label="Zoeken"
      >
        <Search size={13} className="text-fg-2 shrink-0" />
        <span className="text-[12px] text-fg-2">Zoeken</span>
        <span className="ml-auto flex items-center gap-1">
          <span className="fl-kbd text-[11px]">⌘</span>
          <span className="fl-kbd text-[11px]">K</span>
        </span>
      </button>

      {/* Right — user menu */}
      <div className="flex items-center justify-end">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="flex items-center gap-1.5 rounded-md px-1.5 py-1 border-none bg-transparent cursor-pointer text-fg-2 transition-colors hover:bg-bg-3">
              <Avatar src={avatarUrl} name={displayName} size={22} />
              <ChevronDown size={10} className="text-fg-2" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="min-w-[180px] bg-bg-1 border border-border-subtle rounded-md p-1 z-50"
              style={{ boxShadow: "var(--elev-popover)" }}
            >
              <div className="px-2.5 py-2 border-b border-border-subtle mb-1">
                <p className="m-0 text-[13px] font-medium text-fg-1">{displayName}</p>
                <p className="m-0 mt-0.5 text-[12px] text-fg-3">{user?.email}</p>
              </div>

              <DropdownMenu.Item asChild>
                <button className="dropdown-item w-full flex items-center gap-2 h-8 px-2.5 rounded-md border-none bg-transparent cursor-pointer text-[13px] font-medium text-fg-1 text-left outline-none transition-colors hover:bg-bg-3">
                  <User size={14} />
                  Profiel
                </button>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-border-subtle my-1" />

              <DropdownMenu.Item asChild>
                <button
                  className="dropdown-item w-full flex items-center gap-2 h-8 px-2.5 rounded-md border-none bg-transparent cursor-pointer text-[13px] font-medium text-orange-500 text-left outline-none transition-colors hover:bg-bg-3"
                  onClick={handleSignOut}
                >
                  <LogOut size={14} />
                  Uitloggen
                </button>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
