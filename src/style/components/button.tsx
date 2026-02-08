import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/style/utils"
import clsx from "clsx"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "",
        accent: "",
        secondary: "",
        destructive: "",
        outline: "border border-input bg-background shadow-sm hover:bg-muted",
        link: "underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
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
        className: "bg-transparent text-primary hover:bg-primary/20 focus-visible:ring-primary",
      },
      {
        variant: "primary",
        intensity: "soft",
        className: "bg-primary/20 text-foreground hover:bg-primary/30 dark:bg-primary/30 dark:hover:bg-primary/40 focus-visible:ring-primary",
      },
      {
        variant: "primary",
        intensity: "solid",
        className: "bg-primary text-primary-foreground shadow hover:bg-primary/90 focus-visible:ring-primary",
      },
      {
        variant: "primary",
        intensity: "bold",
        className: "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 font-semibold focus-visible:ring-primary",
      },
      // Accent variants
      {
        variant: "accent",
        intensity: "ghost",
        className: "bg-transparent text-accent hover:bg-accent/20 focus-visible:ring-accent",
      },
      {
        variant: "accent",
        intensity: "soft",
        className: "bg-accent/20 text-foreground hover:bg-accent/30 dark:bg-accent/30 dark:hover:bg-accent/40 focus-visible:ring-accent",
      },
      {
        variant: "accent",
        intensity: "solid",
        className: "bg-accent text-accent-foreground shadow hover:bg-accent/90 focus-visible:ring-accent",
      },
      {
        variant: "accent",
        intensity: "bold",
        className: "bg-accent text-accent-foreground shadow-lg hover:bg-accent/90 font-semibold focus-visible:ring-accent",
      },
      // Secondary variants
      {
        variant: "secondary",
        intensity: "ghost",
        className: "bg-transparent text-secondary hover:bg-secondary/20 focus-visible:ring-secondary",
      },
      {
        variant: "secondary",
        intensity: "soft",
        className: "bg-secondary/20 text-foreground hover:bg-secondary/30 dark:bg-secondary/30 dark:hover:bg-secondary/40 focus-visible:ring-secondary",
      },
      {
        variant: "secondary",
        intensity: "solid",
        className: "bg-secondary text-secondary-foreground shadow hover:bg-secondary/90 focus-visible:ring-secondary",
      },
      {
        variant: "secondary",
        intensity: "bold",
        className: "bg-secondary text-secondary-foreground shadow-lg hover:bg-secondary/90 font-semibold focus-visible:ring-secondary",
      },
      // Destructive variants
      {
        variant: "destructive",
        intensity: "ghost",
        className: "bg-transparent text-destructive hover:bg-destructive/20 focus-visible:ring-destructive",
      },
      {
        variant: "destructive",
        intensity: "soft",
        className: "bg-destructive/20 text-foreground hover:bg-destructive/30 dark:bg-destructive/30 dark:hover:bg-destructive/40 focus-visible:ring-destructive",
      },
      {
        variant: "destructive",
        intensity: "solid",
        className: "bg-destructive text-destructive-foreground shadow hover:bg-destructive/90 focus-visible:ring-destructive",
      },
      {
        variant: "destructive",
        intensity: "bold",
        className: "bg-destructive text-destructive-foreground shadow-lg hover:bg-destructive/90 font-semibold focus-visible:ring-destructive",
      },
      // Link text colors
      {
        variant: "link",
        intensity: "ghost",
        className: "text-primary/60",
      },
      {
        variant: "link",
        intensity: "soft",
        className: "text-primary/80",
      },
      {
        variant: "link",
        intensity: "solid",
        className: "text-primary",
      },
      {
        variant: "link",
        intensity: "bold",
        className: "text-primary font-semibold",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "default",
      intensity: "solid",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, intensity, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, intensity, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
