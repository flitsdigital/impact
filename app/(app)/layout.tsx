"use client"

import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { useSidebarStore } from "@/store/sidebar"
import { SvgIcon } from "@/components/ui/SvgIcon"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { collapsed, toggle } = useSidebarStore()

  return (
    <div className="flex flex-col h-screen bg-bg-0 overflow-hidden">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar wrapper — animates width on collapse */}
        <div
          className="shrink-0 overflow-hidden transition-[width,min-width] duration-200 ease-in-out"
          style={{
            width: collapsed ? 0 : "var(--sidebar-w)",
            minWidth: collapsed ? 0 : "var(--sidebar-w)",
          }}
        >
          <Sidebar />
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden pt-[15px] px-4 pb-4 min-w-0 relative flex flex-col">
          {/* Collapse toggle */}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Sidebar uitklappen" : "Sidebar inklappen"}
            className="absolute left-1 top-[27px] z-10 flex items-center justify-center size-[22px] p-1 rounded-sm border border-border-subtle bg-bg-3 cursor-pointer text-fg-2 transition-colors hover:text-fg-1 hover:bg-bg-4"
          >
            {/* chevrons-right doesn't exist → red circle; chevrons-left exists */}
            {collapsed
              ? <SvgIcon name="chevrons-right" size={14} />
              : <SvgIcon name="chevrons-left"  size={14} />
            }
          </button>

          <div className="border border-border-subtle rounded-md bg-bg-1 h-full flex flex-col overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
