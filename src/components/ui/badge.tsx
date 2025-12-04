import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "gold" | "success" | "warning"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-zinc-800 text-white": variant === "default",
          "border-transparent bg-zinc-700 text-white": variant === "secondary",
          "border-gold/20 bg-gold/10 text-gold": variant === "gold",
          "border-green-500/20 bg-green-500/10 text-green-500": variant === "success",
          "border-yellow-500/20 bg-yellow-500/10 text-yellow-500": variant === "warning",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
