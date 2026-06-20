"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SvgIcon } from "@/components/ui/SvgIcon"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/Drawer"
import { useVisibleNav, type NavItem } from "@/components/layout/Sidebar"

// Primaire tabs onderaan; al het overige leeft in het "Meer"-sheet.
const TABS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", svgName: "layout-grid" },
  { href: "/klanten", label: "Klanten", svgName: "users" },
  { href: "/projecten", label: "Projecten", svgName: "chart-kanban" },
  { href: "/content", label: "Content", svgName: "file-text" },
]

function useIsActive() {
  const pathname = usePathname()
  return (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
}

const tabClass =
  "group relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-fg-2 transition-colors active:bg-bg-2 data-[active=true]:text-fg-1"

/** Dunne merk-accent bovenaan de actieve tab. */
function ActiveIndicator() {
  return (
    <span className="absolute top-0 h-0.5 w-7 rounded-full bg-brand-yellow opacity-0 transition-opacity duration-200 ease-strong group-data-[active=true]:opacity-100" />
  )
}

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const isActive = useIsActive()

  return (
    <>
      <nav
        aria-label="Hoofdnavigatie"
        className="md:hidden shrink-0 z-30 flex items-stretch border-t border-border-subtle bg-bg-0"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            data-active={isActive(tab.href) ? "true" : "false"}
            className={`${tabClass} no-underline`}
          >
            <ActiveIndicator />
            <SvgIcon name={tab.svgName} size={20} className="text-inherit" />
            <span className="text-[10px] font-medium leading-none">{tab.label}</span>
          </Link>
        ))}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          data-active={moreOpen ? "true" : "false"}
          className={tabClass}
          aria-label="Meer menu-items"
        >
          <SvgIcon name="ellipsis" size={20} className="text-inherit" />
          <span className="text-[10px] font-medium leading-none">Meer</span>
        </button>
      </nav>

      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} isActive={isActive} />
    </>
  )
}

function MoreSheet({
  open,
  onOpenChange,
  isActive,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isActive: (href: string) => boolean
}) {
  const { primary, klanten, projecten, footer } = useVisibleNav()
  const sections = [
    { label: null, items: primary },
    { label: "Klanten", items: klanten },
    { label: "Projecten", items: projecten },
    { label: "Overig", items: footer },
  ].filter((s) => s.items.length > 0)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex-row items-center justify-between">
          <DrawerTitle>Menu</DrawerTitle>
          <DrawerClose
            aria-label="Sluiten"
            className="flex size-7 items-center justify-center rounded-md text-fg-2 transition-colors hover:bg-bg-3 hover:text-fg-1"
          >
            <SvgIcon name="x" size={16} />
          </DrawerClose>
        </DrawerHeader>

        <div
          className="flex flex-col gap-4 overflow-y-auto px-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        >
          {sections.map((section, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              {section.label && (
                <span className="t-section-label px-2 py-1">{section.label}</span>
              )}
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  data-active={isActive(item.href) ? "true" : "false"}
                  className="fl-navrow no-underline justify-between"
                >
                  <span className="flex items-center gap-[10px]">
                    <SvgIcon name={item.svgName} size={16} className="shrink-0 text-inherit" />
                    <span className="text-[13px] font-medium">{item.label}</span>
                  </span>
                  {item.count != null && <span className="t-counter">{item.count}</span>}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
