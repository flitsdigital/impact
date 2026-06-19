"use client"

import { cn } from "@/lib/utils"
import { SvgIcon } from "@/components/ui/SvgIcon"

export interface StepperStep {
  id: string
  label: string
  icon?: string
}

/**
 * Voortgangsindicator voor meerstaps-flows (wizards). Toont een balk per stap;
 * voltooide stappen krijgen een vinkje, de actieve een nadruk. Eerdere stappen
 * zijn klikbaar via `onJump` (terug navigeren).
 */
export function Stepper({
  steps,
  current,
  onJump,
  className,
}: {
  steps: StepperStep[]
  current: number
  onJump?: (index: number) => void
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        const canJump = typeof onJump === "function" && i < current
        return (
          <div key={step.id} className="flex flex-1 flex-col gap-1.5">
            <div className={cn("h-1 w-full rounded-full transition-colors ease-strong duration-200", i <= current ? "bg-fg-1" : "bg-bg-3")} />
            <button
              type="button"
              disabled={!canJump}
              onClick={() => canJump && onJump(i)}
              className={cn(
                "flex items-center gap-1.5 text-left text-[12px] transition-colors",
                canJump ? "cursor-pointer" : "cursor-default",
                active ? "text-fg-1" : done ? "text-fg-2 hover:text-fg-1" : "text-fg-3",
              )}
            >
              <span
                className={cn(
                  "grid size-4 shrink-0 place-content-center rounded-full text-[10px]",
                  done ? "bg-green-500/15 text-green-500" : active ? "bg-fg-1 text-bg-0" : "bg-bg-3 text-fg-3",
                )}
              >
                {done ? <SvgIcon name="check" size={10} /> : step.icon ? <SvgIcon name={step.icon} size={10} /> : i + 1}
              </span>
              <span className="truncate font-medium">{step.label}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
