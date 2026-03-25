import * as React from "react";
import { cn } from "@/lib/tailwindUtils";

interface MultiSelectSeparatorProps
  extends React.ComponentPropsWithoutRef<"div"> {}

export const MultiSelectSeparator = React.forwardRef<
  HTMLDivElement,
  MultiSelectSeparatorProps
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="separator"
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  );
});
MultiSelectSeparator.displayName = "MultiSelectSeparator";