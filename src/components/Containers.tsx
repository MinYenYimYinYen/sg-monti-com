import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/style/utils";

const containerVariants = cva("w-full", {
  variants: {
    variant: {
      centered:
        "flex min-h-screen items-center justify-center bg-background p-4",
      page: "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1",
      fluid: "w-full px-4 py-8 sm:px-6 lg:px-8",
    },
  },
  defaultVariants: {
    variant: "page",
  },
});

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  title?: string;
  action?: React.ReactNode;
}

export function Container({
  className,
  variant,
  title,
  action,
  children,
  ...props
}: ContainerProps) {
  return (
    <div className={cn(containerVariants({ variant, className }))} {...props}>
      {(title || action) && variant !== "centered" && (
        <div className="mb-8 flex items-center justify-between">
          {title && <h1 className="text-2xl font-bold text-foreground">{title}</h1>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
