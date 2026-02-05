import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/style/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "",
        accent: "",
        secondary: "",
        destructive: "",
        outline: "text-foreground",
      },
      intensity: {
        ghost: "",
        soft: "",
        solid: "",
        bold: "",
      },
    },
    compoundVariants: [
      // Primary variants
      {
        variant: "primary",
        intensity: "ghost",
        className: "border-transparent bg-primary/10 text-primary focus:ring-primary",
      },
      {
        variant: "primary",
        intensity: "soft",
        className: "border-transparent bg-primary/20 text-foreground dark:bg-primary/30 focus:ring-primary",
      },
      {
        variant: "primary",
        intensity: "solid",
        className: "border-transparent bg-primary text-primary-foreground shadow focus:ring-primary",
      },
      {
        variant: "primary",
        intensity: "bold",
        className: "border-transparent bg-primary text-primary-foreground shadow-lg font-bold focus:ring-primary",
      },
      // Accent variants
      {
        variant: "accent",
        intensity: "ghost",
        className: "border-transparent bg-accent/10 text-accent focus:ring-accent",
      },
      {
        variant: "accent",
        intensity: "soft",
        className: "border-transparent bg-accent/20 text-foreground dark:bg-accent/30 focus:ring-accent",
      },
      {
        variant: "accent",
        intensity: "solid",
        className: "border-transparent bg-accent text-accent-foreground shadow focus:ring-accent",
      },
      {
        variant: "accent",
        intensity: "bold",
        className: "border-transparent bg-accent text-accent-foreground shadow-lg font-bold focus:ring-accent",
      },
      // Secondary variants
      {
        variant: "secondary",
        intensity: "ghost",
        className: "border-transparent bg-secondary/10 text-secondary focus:ring-secondary",
      },
      {
        variant: "secondary",
        intensity: "soft",
        className: "border-transparent bg-secondary/20 text-foreground dark:bg-secondary/30 focus:ring-secondary",
      },
      {
        variant: "secondary",
        intensity: "solid",
        className: "border-transparent bg-secondary text-secondary-foreground shadow focus:ring-secondary",
      },
      {
        variant: "secondary",
        intensity: "bold",
        className: "border-transparent bg-secondary text-secondary-foreground shadow-lg font-bold focus:ring-secondary",
      },
      // Destructive variants
      {
        variant: "destructive",
        intensity: "ghost",
        className: "border-transparent bg-destructive/10 text-destructive focus:ring-destructive",
      },
      {
        variant: "destructive",
        intensity: "soft",
        className: "border-transparent bg-destructive/20 text-foreground dark:bg-destructive/30 focus:ring-destructive",
      },
      {
        variant: "destructive",
        intensity: "solid",
        className: "border-transparent bg-destructive text-destructive-foreground shadow focus:ring-destructive",
      },
      {
        variant: "destructive",
        intensity: "bold",
        className: "border-transparent bg-destructive text-destructive-foreground shadow-lg font-bold focus:ring-destructive",
      },
    ],
    defaultVariants: {
      variant: "primary",
      intensity: "solid",
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
