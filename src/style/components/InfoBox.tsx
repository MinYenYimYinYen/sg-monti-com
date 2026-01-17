import { cn } from "@/style/utils";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

const infoBoxVariants = cva("rounded-md p-4 text-sm", {
  variants: {
    variant: {
      default: "bg-sg-blue-bg text-sg-blue-brdr",
      success: "bg-sg-green-bg text-sg-green-brdr",
      destructive: "bg-destructive/10 text-destructive",
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
