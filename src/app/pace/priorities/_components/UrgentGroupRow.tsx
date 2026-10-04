"use client";

import { UrgentGroup } from "@/app/pace/PaceEngineTypes";

export function UrgentGroupRow({ group }: { group: UrgentGroup }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 last:border-0 text-xs">
      <div className="flex-1 min-w-0">
        <span className="font-mono font-semibold text-foreground">{group.label}</span>
        <span className="ml-2 text-[9px] text-muted-foreground font-mono">
          ({group.groupId})
        </span>
      </div>
      {group.reason.kind === "overdue" && (
        <span className="text-[9px] text-destructive bg-destructive/10 rounded px-1.5 py-0.5 shrink-0">
          Past plan end {group.reason.deadline}
        </span>
      )}
      {group.reason.kind === "unplanned" && (
        <span className="text-[9px] text-secondary bg-secondary/10 rounded px-1.5 py-0.5 shrink-0">
          Unplanned
        </span>
      )}
    </div>
  );
}
