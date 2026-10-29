"use client";

import { useSelector } from "react-redux";
import { TriangleAlert } from "lucide-react";
import { custFlagSelect } from "@/app/realGreen/custFlag/_lib/custFlagSelect";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";

/**
 * The nav bar flag filter narrows the loaded customers invisibly on this tab, so any active
 * selection makes the batch counts and letters incomplete. Display only: clearing happens in the nav bar.
 */
export function RenewalFlagFilterWarning({ compact = false }: { compact?: boolean }) {
  const selectedFlagIds = useSelector(custFlagSelect.selectedFlagIds);
  const flagDocMap = useSelector(flagSelect.flagDocMap);

  if (selectedFlagIds.length === 0) return null;

  const flagNames = selectedFlagIds.map(
    (flagId) => flagDocMap.get(flagId)?.desc ?? `Flag #${flagId}`,
  );

  return (
    <div
      role="alert"
      className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium">Nav bar flag filter is active</p>
        <p className="text-xs text-muted-foreground">
          Only customers with at least one of these flags are batched, so counts and letters are
          incomplete: {flagNames.join(", ")}.
        </p>
        {!compact && (
          <p className="text-xs text-muted-foreground">
            Clear the flags in the nav bar to include everyone.
          </p>
        )}
      </div>
    </div>
  );
}
