import Link from "next/link"
import { buttonVariants } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { cn } from "@/lib/utils"

export default function GeenToegangPage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <EmptyState
        icon="triangle-exclamation"
        title="Geen toegang"
        description="Je hebt geen rechten voor deze pagina. Vraag een beheerder om toegang."
        action={
          <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }), "mt-2")}>
            Naar dashboard
          </Link>
        }
      />
    </div>
  )
}
