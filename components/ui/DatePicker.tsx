"use client"

import * as React from "react"
import { nl } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { toLocalDateStr } from "@/lib/dates"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SvgIcon } from "@/components/ui/SvgIcon"

/** Parse "YYYY-MM-DD" naar een lokale Date (middag, om tijdzone-shift te vermijden). */
function parseValue(value?: string): Date | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split("-").map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d, 12)
}

function formatLabel(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export interface DatePickerProps {
  /** Gecontroleerde waarde als "YYYY-MM-DD". */
  value?: string
  onChange?: (value: string) => void
  /** Rendert een verborgen input zodat de waarde meekomt in een FormData-submit. */
  name?: string
  id?: string
  placeholder?: string
  /** "field" lijkt op een Input, "pill" is een compacte chip met kalender-icoon. */
  variant?: "field" | "pill"
  /** Toont een "wissen"-knop in de popover wanneer er een datum gekozen is. */
  clearable?: boolean
  disabled?: boolean
  autoFocus?: boolean
  /** Extra classes voor de trigger-knop. */
  className?: string
  "aria-label"?: string
}

export function DatePicker({
  value,
  onChange,
  name,
  id,
  placeholder = "Kies datum",
  variant = "field",
  clearable = true,
  disabled,
  autoFocus,
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const isControlled = value !== undefined
  const [internal, setInternal] = React.useState<string>("")
  const current = isControlled ? value : internal
  const [open, setOpen] = React.useState(false)

  const selected = parseValue(current)

  const commit = (next: string) => {
    if (!isControlled) setInternal(next)
    onChange?.(next)
  }

  const handleSelect = (date: Date | undefined) => {
    if (!date) return
    commit(toLocalDateStr(date))
    setOpen(false)
  }

  const triggerClasses =
    variant === "pill"
      ? cn(
          "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full bg-secondary px-3 text-xs text-secondary-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground",
          className,
        )
      : cn(
          "inline-flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:border-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          !selected && "text-muted-foreground",
          className,
        )

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          data-vaul-no-drag
          className={triggerClasses}
        >
          <SvgIcon name="calendar" size={variant === "pill" ? 12 : 14} className="shrink-0 text-muted-foreground" />
          <span className="truncate">{selected ? formatLabel(selected) : placeholder}</span>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          // pointer-events-auto: de popup wordt naar <body> geportald, en vaul/base-ui
          // dialogs (onze Drawer/Dialog) zetten `body { pointer-events: none }` als ze open zijn.
          className="pointer-events-auto w-auto p-0"
        >
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={handleSelect}
            locale={nl}
            captionLayout="dropdown"
            autoFocus
          />
          {clearable && selected && (
            <button
              type="button"
              onClick={() => {
                commit("")
                setOpen(false)
              }}
              className="w-full border-t border-border px-3 py-2 text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Wis datum
            </button>
          )}
        </PopoverContent>
      </Popover>
      {name && <input type="hidden" name={name} value={current} />}
    </>
  )
}
