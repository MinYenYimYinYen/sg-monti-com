"use client";

import { useState } from "react";
import { Pencil, Target, X } from "lucide-react";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { FeasibilityBadge } from "@/app/pace/seasonPlan/_components/FeasibilityBadge";
import { GroupDialog } from "@/app/pace/setup/groups/_components/GroupDialog";
import { GroupGoalsDialog } from "@/app/pace/setup/groups/_components/GroupGoalsDialog";
import { usePaceAssignmentGroup } from "@/app/pace/assignmentGroup/useAssignmentGroup";

type GroupListItemProps = {
  group: AssignmentGroup;
};

export function GroupListItem({ group }: GroupListItemProps) {
  const { deleteGroup } = usePaceAssignmentGroup();
  const [editOpen, setEditOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasAssignedEmployees = group.assignedEmployeeIds.length > 0;

  function handleDelete() {
    void deleteGroup(group.groupId);
    setConfirmDelete(false);
  }

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 hover:bg-accent/5 group/row">
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

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              {hasAssignedEmployees && (
                <span className="text-[9px] text-secondary">
                  {group.assignedEmployeeIds.length} emp assigned
                </span>
              )}
              <button
                onClick={handleDelete}
                className="text-[9px] text-destructive font-semibold hover:underline"
              >
                Del
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[9px] text-muted-foreground hover:underline"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete group"
            >
              <X className="w-3 h-3" />
            </button>
          )}
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
