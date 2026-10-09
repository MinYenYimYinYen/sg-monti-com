"use client";

import { useState } from "react";
import { Pencil, Target } from "lucide-react";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { FeasibilityBadge } from "@/app/pace/seasonPlan/_components/FeasibilityBadge";
import { GroupDialog } from "@/app/pace/setup/groups/_components/GroupDialog";
import { GroupGoalsDialog } from "@/app/pace/setup/groups/_components/GroupGoalsDialog";

type SequenceMemberRowProps = {
  group: AssignmentGroup;
  position: number;
};

export function SequenceMemberRow({ group, position }: SequenceMemberRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/5 group/row">
        {/* Position number */}
        <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">
          {position}.
        </span>

        {/* Group label */}
        <span className="font-mono text-xs font-semibold text-primary truncate min-w-0">
          {group.label}
        </span>

        {/* ServCode badges */}
        <div className="flex flex-wrap gap-0.5 shrink-0">
          {group.servCodeIds.map((id) => (
            <span
              key={id}
              className="font-mono text-[8px] text-primary/70 bg-primary/10 rounded px-0.5"
            >
              {id}
            </span>
          ))}
        </div>

        {/* Employee count */}
        <span className="text-[10px] text-muted-foreground shrink-0">
          {group.assignedEmployeeIds.length} emp
        </span>

        {/* Planned date range */}
        {(group.plannedStart || group.plannedEnd) && (
          <span className="text-[10px] text-muted-foreground shrink-0">
            {group.plannedStart ?? "?"} – {group.plannedEnd ?? "?"}
          </span>
        )}

        {/* Feasibility badge */}
        <div className="shrink-0">
          <FeasibilityBadge groupId={group.groupId} />
        </div>

        {/* Actions — visible on hover */}
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => setGoalsOpen(true)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
            title="Edit goals"
          >
            <Target className="w-3 h-3" />
          </button>
          <button
            onClick={() => setEditOpen(true)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
            title="Edit group"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      </div>

      {editOpen && (
        <GroupDialog
          group={group}
          open={editOpen}
          onCloseAction={() => setEditOpen(false)}
        />
      )}

      {goalsOpen && (
        <GroupGoalsDialog
          group={group}
          open={goalsOpen}
          onCloseAction={() => setGoalsOpen(false)}
        />
      )}
    </>
  );
}
