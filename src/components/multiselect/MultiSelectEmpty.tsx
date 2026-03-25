import * as React from "react";
import { cn } from "@/lib/tailwindUtils";

interface MultiSelectEmptyProps extends React.ComponentPropsWithoutRef<"div"> {}

export const MultiSelectEmpty = React.forwardRef<
  HTMLDivElement,
  MultiSelectEmptyProps
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("p-4 text-center text-sm text-muted-foreground", className)}
      {...props}
    >
      {children || "No items found"}
    </div>
  );
});
MultiSelectEmpty.displayName = "MultiSelectEmpty";