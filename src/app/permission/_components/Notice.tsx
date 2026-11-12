import { cn } from "@/style/utils";

/** A short message box. `warning` is for things to look at, `info` for context. Never blocks anything. */
export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm text-foreground",
        tone === "warning" ? "border-destructive/40 bg-destructive/10" : "border-border bg-accent/10",
      )}
    >
      {children}
    </div>
  );
}
