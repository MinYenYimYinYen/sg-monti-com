"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Circle } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/style/utils"

const RadioGroupVariantContext = React.createContext<"classic" | "button-group">("classic")

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> & {
    variant?: "classic" | "button-group"
  }
>(({ className, variant = "classic", ...props }, ref) => {
  return (
    <RadioGroupVariantContext.Provider value={variant}>
      <RadioGroupPrimitive.Root
        className={cn(
          variant === "classic" ? "grid gap-2" : "flex items-stretch -space-x-px",
          className
        )}
        {...props}
        ref={ref}
      />
    </RadioGroupVariantContext.Provider>
  )
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const radioGroupItemVariants = cva(
  "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        classic:
          "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow",
        "button-group":
          "relative inline-flex items-center justify-center border border-primary/50 bg-background px-3 py-2 text-sm font-medium transition-all hover:bg-muted focus:z-10 data-[state=checked]:z-10 data-[state=checked]:border-primary data-[state=checked]:bg-primary/20 data-[state=checked]:text-primary first:rounded-l-md last:rounded-r-md rounded-none",
      },
    },
    defaultVariants: {
      variant: "classic",
    },
  }
)

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> &
    VariantProps<typeof radioGroupItemVariants>
>(({ className, variant: variantProp, ...props }, ref) => {
  const contextVariant = React.useContext(RadioGroupVariantContext)
  const variant = variantProp || contextVariant

  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(radioGroupItemVariants({ variant }), className)}
      {...props}
    >
      {variant === "classic" ? (
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <Circle className="h-3.5 w-3.5 fill-primary" />
        </RadioGroupPrimitive.Indicator>
      ) : (
        props.children
      )}
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem }
