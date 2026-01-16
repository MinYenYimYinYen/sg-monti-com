import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/style/utils";
import { clsx } from "clsx";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sg-blue-brdr focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: clsx("bg-sg-blue-brdr text-white hover:bg-sg-blue-brdr/90"),
        destructive: "bg-sg-warn-fg text-white hover:bg-sg-warn-fg/90",
        outline:
          "border border-sg-blue-brdr bg-transparent text-sg-blue-brdr hover:bg-sg-blue-bg hover:text-sg-blue-brdr",
        secondary: "bg-sg-green-brdr text-white hover:bg-sg-green-brdr/80",
        ghost: "hover:bg-sg-blue-bg hover:text-sg-blue-brdr text-sg-blue-brdr",
        link: "text-sg-blue-brdr underline-offset-4 hover:underline",
        loading:
          "bg-sg-green-brdr/20 text-transparent animate-pulse pointer-events-none select-none",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
