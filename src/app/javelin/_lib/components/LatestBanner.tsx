"use client";
import { useSelector } from "react-redux";
import { AlertTriangle } from "lucide-react";
import { javelinSelect } from "@/app/javelin/javelinSelect";
import { describeLatest } from "@/app/javelin/_lib/latestUtils";
import { JavelinKind } from "@/app/javelin/JavelinTypes";

/**
 * Tells the user what was last posted, so they know which CSV data to export next. Unsettled
 * entries (unknown or stuck posting) make the date unreliable, so they are called out.
 */
export function LatestBanner({ kind }: { kind: JavelinKind }) {
  const latest = useSelector(javelinSelect.latest);
  if (!latest) return null;

  return (
    <div className="mb-4 space-y-2 rounded-md border border-border bg-accent/10 p-3 text-sm text-foreground">
      <p>{describeLatest({ kind, latest })}</p>
      {latest.unsettledDocNumbers.length > 0 && (
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
          {latest.unsettledDocNumbers.length} entr
          {latest.unsettledDocNumbers.length === 1 ? "y is" : "ies are"} unconfirmed (the request to
          QuickBooks did not finish cleanly). Check them in QuickBooks before relying on this date.
        </p>
      )}
    </div>
  );
}
