"use client"

import { cn } from "@/lib/utils"
import { roleMeta, type RoleId } from "@/lib/permissions"

/**
 * Rol-pill met gekleurde dot. Klikbaar (selecteerbaar via onClick) of puur
 * informatief — in dat laatste geval een <span>, zodat 'ie veilig in een
 * klikbare kaart/button genest kan worden. Kleur/naam uit ROLE_META.
 */
export function RolePill({
  role,
  active,
  onClick,
  className,
}: {
  role: RoleId
  active?: boolean
  onClick?: () => void
  className?: string
}) {
  const r = roleMeta(role)
  const classes = cn(
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] transition-colors ease-strong duration-200",
    active ? cn(r.bg, r.tint) : "border border-border-subtle text-fg-2",
    className,
  )
  const dot = <span className={cn("size-1.5 rounded-full", r.tint.replace("text-", "bg-"))} />

  if (typeof onClick !== "function") {
    return (
      <span className={classes}>
        {dot}
        {r.name}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={cn(classes, "cursor-pointer", !active && "hover:text-fg-1")}
    >
      {dot}
      {r.name}
    </button>
  )
}
