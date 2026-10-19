"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { paceGroupSequenceSelect } from "@/app/pace/groupSequence/groupSequenceSelect";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { assignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
import { paceAssignmentPlanActions } from "@/app/pace/assignmentPlan/assignmentPlanSlice";
import { GroupAssignment } from "@/app/pace/assignmentPlan/AssignmentPlanTypes";

type AddSequenceDropdownProps = {
  employeeId: string;
  existingGroupAssignments: GroupAssignment[];
};

/**
 * Popover dropdown showing all sequences.
 * Clicking a sequence appends all unassigned groups from that sequence in sequence order,
 * each with dailyRevenueGoal: null.
 */
export function AddSequenceDropdown({
  employeeId,
  existingGroupAssignments,
}: AddSequenceDropdownProps) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const sequences = useSelector(paceGroupSequenceSelect.sequences);
  const assignmentGroupMap = useSelector(paceAssignmentGroupSelect.assignmentGroupMap);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);

  const existingGroupIds = new Set(existingGroupAssignments.map((ga) => ga.groupId));

  function handleSelect(sequenceId: string) {
    const sequence = sequences.find((s) => s.sequenceId === sequenceId);
    if (!sequence) return;

    // Append only groups not already assigned, in sequence order
    const newGroupIds = sequence.groupIds.filter((id) => !existingGroupIds.has(id));
    if (newGroupIds.length > 0) {
      const plan = assignmentsByEmployeeId.get(employeeId);
      const currentAssignments = plan?.groupAssignments ?? [];
      const newAssignments: GroupAssignment[] = newGroupIds.map((groupId) => ({
        groupId,
        dailyRevenueGoal: null,
      }));
      dispatch(
        paceAssignmentPlanActions.reorderGroupAssignments({
          employeeId,
          groupAssignments: [...currentAssignments, ...newAssignments],
        }),
      );
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 h-7 px-2.5 rounded text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors">
          Add Sequence
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        {sequences.length === 0 ? (
          <p className="px-2 py-1.5 text-[10px] text-muted-foreground">
            No sequences defined.
          </p>
        ) : (
          <div className="space-y-0.5">
            {sequences.map((sequence) => {
              const unassignedCount = sequence.groupIds.filter(
                (id) => !existingGroupIds.has(id),
              ).length;
              const groupLabels = sequence.groupIds
                .map((id) => assignmentGroupMap.get(id)?.label ?? id)
                .join(" → ");

              return (
                <button
                  key={sequence.sequenceId}
                  onClick={() => handleSelect(sequence.sequenceId)}
                  disabled={unassignedCount === 0}
                  className="w-full flex flex-col gap-0.5 px-2 py-1.5 rounded hover:bg-accent/10 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {sequence.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground shrink-0">
                      {unassignedCount === 0
                        ? "all assigned"
                        : `+${unassignedCount} group${unassignedCount !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                  <span className="text-[9px] text-muted-foreground truncate">{groupLabels}</span>
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
