import * as React from "react";
import { cn } from "@/style/utils";

// ---------------------------------------------------------------------------
// PageLayout — outer shell for tab-routed pages.
// Provides the flex column structure, sticky header bar, and scrollable body.
// ---------------------------------------------------------------------------

function PageLayoutRoot({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageLayout.Header — shrink-0 bar with left and right slots.
// ---------------------------------------------------------------------------

function PageLayoutHeader({
  left,
  right,
  className,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-card",
        className,
      )}
    >
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex items-center gap-1">{right}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageLayout.Body — flex-1 scrollable body.
// ---------------------------------------------------------------------------

function PageLayoutBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 min-h-0 overflow-hidden", className)}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compound export
// ---------------------------------------------------------------------------

export const PageLayout = Object.assign(PageLayoutRoot, {
  Header: PageLayoutHeader,
  Body: PageLayoutBody,
});
