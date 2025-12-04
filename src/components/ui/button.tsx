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
          "inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-gold text-black hover:bg-gold-light hover:scale-105 shadow-gold":
              variant === "default",
            "bg-gold hover:bg-gold-dark text-black hover:scale-105":
              variant === "gold",
            "border-2 border-gold text-gold hover:bg-gold hover:text-black":
              variant === "outline",
            "hover:bg-gold/10 text-gold": variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700 hover:scale-105":
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
