import * as React from "react";
import { cn } from "@/style/utils";

export function CenteredContainer({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex min-h-screen w-full items-center justify-center bg-background p-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
