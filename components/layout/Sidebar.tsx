"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SvgIcon } from "@/components/ui/SvgIcon"

const NAV = {
  primary: [
    { href: "/dashboard", label: "Dashboard", svgName: "layout-grid" },
    { href: "/inbox", label: "Inbox", svgName: "inbox", count: 7, kbds: ["⌘", "⌥", "G"] },
  ],
  klanten: [
    { href: "/klanten",  label: "Klanten",             svgName: "users" },
    { href: "/timeline", label: "Facturatie tijdlijn", svgName: "chart-gantt" },
    { href: "/content", label: "Content", svgName: "file-text" },
    { href: "/leads", label: "Leads", svgName: "user-plus" },
  ],
  projecten: [
    { href: "/projecten", label: "Projecten", svgName: "chart-kanban" },
    { href: "/taken", label: "Taken", svgName: "check-square" },
  ],
  footer: [
    { href: "/todos", label: "Taken", svgName: "list-check", count: 7, kbds: ["⌘", "T"] },
    { href: "/gebruikers", label: "Gebruikers", svgName: "smile" },
    { href: "/instellingen", label: "Instellingen", svgName: "settings" },
  ],
}

function NavRow({
  href,
  label,
  svgName,
  count,
  kbds,
}: {
  href: string
  label: string
  svgName: string
  count?: number
  kbds?: string[]
}) {
  const pathname = usePathname()
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className="fl-navrow no-underline justify-between"
      data-active={active ? "true" : "false"}
    >
      <span className="flex items-center gap-[10px]">
        <SvgIcon name={svgName} size={16} className="shrink-0 text-inherit" />
        <span className="text-[13px] font-medium">{label}</span>
        {kbds && (
          <span className="flex gap-1 ml-1.5">
            {kbds.map((k, i) => (
              <span key={i} className="fl-kbd text-[11px]">{k}</span>
            ))}
          </span>
        )}
      </span>
      {count != null && <span className="t-counter">{count}</span>}
    </Link>
  )
}

function NavGroup({ label, items }: { label: string; items: { href: string; label: string; svgName: string; count?: number; kbds?: string[] }[] }) {
  const storageKey = `sidebar-group-${label.toLowerCase()}`
  const [open, setOpen] = useState(true)

  // localStorage pas na mount lezen om hydration-mismatch te voorkomen
  useEffect(() => {
    if (localStorage.getItem(storageKey) === "closed") setOpen(false)
  }, [storageKey])

  function toggle() {
    setOpen((prev) => {
      localStorage.setItem(storageKey, prev ? "closed" : "open")
      return !prev
    })
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex items-center gap-1 px-2 py-1 cursor-pointer rounded-md hover:bg-bg-2 transition-colors"
      >
        <span className="t-section-label">{label}</span>
        <SvgIcon
          name="chevron-down"
          size={12}
          className={`text-fg-2 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="flex flex-col gap-0.5 overflow-hidden min-h-0">
          {items.map((item) => (
            <NavRow key={item.href} {...item} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="flex flex-col w-[var(--sidebar-w)] min-w-[var(--sidebar-w)] border-r border-border-subtle bg-bg-0 p-3 h-full overflow-hidden">
      {/* Top section — scrolls if viewport is too short */}
      <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-0.5">
          {NAV.primary.map((item) => (
            <NavRow key={item.href} {...item} />
          ))}
        </div>

        <NavGroup label="Klanten" items={NAV.klanten} />
        <NavGroup label="Projecten" items={NAV.projecten} />
      </div>

      {/* Footer — always anchored at the bottom */}
      <div className="flex flex-col gap-0.5 pt-4 border-t border-border-subtle shrink-0">
        {NAV.footer.map((item) => (
          <NavRow key={item.href} {...item} />
        ))}
      </div>
    </aside>
  )
}
