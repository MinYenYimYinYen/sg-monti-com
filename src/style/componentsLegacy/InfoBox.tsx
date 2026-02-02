import { cn } from "@/style/utils";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

const infoBoxVariants = cva("rounded-md p-4 text-sm", {
  variants: {
    variant: {
      default: "bg-primary-100 text-primary",
      success: "bg-secondary-100 text-secondary",
      destructive: "bg-accent-600/10 text-accent-600",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface InfoBoxProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof infoBoxVariants> {}

export function InfoBox({
  className,
  variant,
  children,
  ...props
}: InfoBoxProps) {
  return (
    <div className={cn(infoBoxVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
}
