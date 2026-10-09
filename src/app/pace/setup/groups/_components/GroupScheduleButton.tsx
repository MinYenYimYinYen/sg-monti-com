"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { GroupScheduleDialog } from "@/app/pace/setup/groups/_components/GroupScheduleDialog";

type GroupScheduleButtonProps = {
  group: AssignmentGroup;
};

/** Formats an ISO date string as "Mon 4/6" */
function formatScheduleDate(iso: string): string {
  const date = new Date(iso + "T12:00:00"); // noon to avoid timezone shifts
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
}

export function GroupScheduleButton({ group }: GroupScheduleButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasSchedule = group.plannedStart !== null && group.plannedEnd !== null;

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className={`flex items-center gap-1 text-[10px] rounded px-1.5 py-0.5 transition-colors ${
          hasSchedule
            ? "text-muted-foreground hover:text-foreground hover:bg-accent/10"
            : "text-primary/70 hover:text-primary hover:bg-primary/10"
        }`}
        title={hasSchedule ? "Edit schedule" : "Add to season plan"}
      >
        <CalendarDays className="w-3 h-3 shrink-0" />
        {hasSchedule ? (
          <span>
            {formatScheduleDate(group.plannedStart!)} – {formatScheduleDate(group.plannedEnd!)}
          </span>
        ) : (
          <span>+ Add to season plan</span>
        )}
      </button>

      {dialogOpen && (
        <GroupScheduleDialog
          group={group}
          open={dialogOpen}
          onCloseAction={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}
