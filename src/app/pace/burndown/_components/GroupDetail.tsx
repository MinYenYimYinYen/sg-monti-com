"use client";

// ---------------------------------------------------------------------------
// GroupDetail — placeholder for assignment group detail view
// ---------------------------------------------------------------------------

type GroupDetailProps = {
  assignmentGroupId: string;
  label: string;
};

export function GroupDetail({ assignmentGroupId, label }: GroupDetailProps) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Selected Group</div>
        <div className="text-base font-semibold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground font-mono">{assignmentGroupId}</div>
      </div>
      <p className="text-xs text-muted-foreground">Group detail coming soon.</p>
    </div>
  );
}
