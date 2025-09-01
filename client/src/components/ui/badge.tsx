import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-cyan-400/50 bg-cyan-400/20 text-cyan-300 hover:bg-cyan-400/30 shadow-[0_0_10px_rgba(6,182,212,0.3)]",
        secondary:
          "border-purple-400/50 bg-purple-400/20 text-purple-300 hover:bg-purple-400/30 shadow-[0_0_10px_rgba(168,85,247,0.3)]",
        destructive:
          "border-red-400/50 bg-red-400/20 text-red-300 hover:bg-red-400/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]",
        outline: "text-foreground border-primary/50 hover:bg-primary/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
