import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "gold" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600/50 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-yellow-600 text-black hover:bg-yellow-500 active:scale-[0.98]":
              variant === "default",
            "bg-yellow-600 hover:bg-yellow-500 text-black active:scale-[0.98]":
              variant === "gold",
            "border border-yellow-600/30 text-yellow-600 hover:bg-yellow-600/10 hover:border-yellow-600/50":
              variant === "outline",
            "hover:bg-yellow-600/10 text-yellow-600": variant === "ghost",
            "bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 active:scale-[0.98]":
              variant === "destructive",
          },
          {
            "h-12 px-6 py-3 text-base": size === "default",
            "h-9 px-4 py-2 text-sm": size === "sm",
            "h-14 px-8 py-4 text-lg": size === "lg",
            "h-10 w-10 p-0": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
