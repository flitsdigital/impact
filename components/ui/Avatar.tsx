import Image from "next/image"
import { cn } from "@/lib/utils"

interface AvatarProps {
  src?: string | null
  name?: string
  size?: number
  className?: string
}

export function Avatar({ src, name, size = 20, className }: AvatarProps) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?"

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full overflow-hidden bg-[var(--bg-3)] shrink-0",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        color: "var(--fg-2)",
        fontWeight: 600,
      }}
    >
      {src ? (
        <Image
          src={src}
          alt={name ?? ""}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      ) : (
        initials
      )}
    </span>
  )
}
