"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";
import { assignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
import { paceAssignmentPlanActions } from "@/app/pace/assignmentPlan/assignmentPlanSlice";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { GroupAssignment } from "@/app/pace/assignmentPlan/AssignmentPlanTypes";

type CopyMode = "append" | "overwrite";

type CopyTarget = {
  employeeId: string;
  /** null = not yet chosen (required when target has existing assignments) */
  mode: CopyMode | null;
};

type CopyAssignmentDialogProps = {
  sourceEmployeeId: string;
  /** The groupIds selected on the source employee's card */
  selectedGroupIds: Set<string>;
  /** Other employee IDs currently displayed (source excluded) */
  otherDisplayedEmployeeIds: string[];
  open: boolean;
  onCloseAction: () => void;
};

export function CopyAssignmentDialog({
  sourceEmployeeId,
  selectedGroupIds,
  otherDisplayedEmployeeIds,
  open,
  onCloseAction,
}: CopyAssignmentDialogProps) {
  const dispatch = useAppDispatch();
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);
  const sourcePlan = assignmentsByEmployeeId.get(sourceEmployeeId);

  // The group assignments to copy (in source order, filtered to selected)
  const groupAssignmentsToCopy: GroupAssignment[] =
    sourcePlan?.groupAssignments.filter((ga) => selectedGroupIds.has(ga.groupId)) ?? [];

  // Local state: Map<employeeId, CopyTarget>
  const [targets, setTargets] = useState<Map<string, CopyTarget>>(new Map());

  function toggleTarget(employeeId: string) {
    setTargets((prev) => {
      const next = new Map(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        const hasExisting =
          (assignmentsByEmployeeId.get(employeeId)?.groupAssignments.length ?? 0) > 0;
        next.set(employeeId, {
          employeeId,
          // Auto-select append when target has no existing assignments
          mode: hasExisting ? null : "append",
        });
      }
      return next;
    });
  }

  function setMode(employeeId: string, mode: CopyMode) {
    setTargets((prev) => {
      const next = new Map(prev);
      const existing = next.get(employeeId);
      if (existing) next.set(employeeId, { ...existing, mode });
      return next;
    });
  }

  const checkedTargets = [...targets.values()];
  const canSubmit =
    checkedTargets.length > 0 &&
    checkedTargets.every((t) => t.mode !== null);

  function handleSubmit() {
    for (const target of checkedTargets) {
      if (target.mode === null) continue;
      const existingPlan = assignmentsByEmployeeId.get(target.employeeId);
      const existingAssignments = existingPlan?.groupAssignments ?? [];

      let newAssignments: GroupAssignment[];
      if (target.mode === "overwrite") {
        newAssignments = groupAssignmentsToCopy;
      } else {
        // Append: add only groups not already assigned
        const existingGroupIds = new Set(existingAssignments.map((ga) => ga.groupId));
        const toAppend = groupAssignmentsToCopy.filter(
          (ga) => !existingGroupIds.has(ga.groupId),
        );
        newAssignments = [...existingAssignments, ...toAppend];
      }

      dispatch(
        paceAssignmentPlanActions.reorderGroupAssignments({
          employeeId: target.employeeId,
          groupAssignments: newAssignments,
        }),
      );
    }
    onCloseAction();
  }

  const sourceEmployee = employeeMap.get(sourceEmployeeId);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCloseAction(); }}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            Copy To…{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {selectedGroupIds.size} group{selectedGroupIds.size !== 1 ? "s" : ""} from{" "}
              {sourceEmployee?.name ?? sourceEmployeeId}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {otherDisplayedEmployeeIds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No other employees are currently displayed. Select additional employees from the left
              panel to copy to them.
            </p>
          ) : (
            <div className="flex gap-4">
              {/* Left column — employee selection */}
              <div className="w-52 shrink-0 space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Copy to
                </p>
                {otherDisplayedEmployeeIds.map((employeeId) => {
                  const employee = employeeMap.get(employeeId);
                  const isChecked = targets.has(employeeId);
                  return (
                    <label
                      key={employeeId}
                      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/10 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTarget(employeeId)}
                        className="accent-primary shrink-0"
                      />
                      <span className="text-xs text-foreground truncate font-mono">
                        {employeeId}-{employee?.name ?? employeeId}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Right column — mode selection for checked targets */}
              <div className="flex-1 min-w-0 space-y-2">
                {checkedTargets.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground pt-6 text-center">
                    Select employees on the left.
                  </p>
                ) : (
                  <>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Action
                    </p>
                    {checkedTargets.map((target) => {
                      const employee = employeeMap.get(target.employeeId);
                      const existingCount =
                        assignmentsByEmployeeId.get(target.employeeId)?.groupAssignments.length ?? 0;
                      const hasExisting = existingCount > 0;

                      return (
                        <div
                          key={target.employeeId}
                          className="flex items-center gap-3 px-2 py-1.5 rounded bg-accent/5 border border-border/50"
                        >
                          <span className="text-xs text-foreground truncate min-w-0 flex-1 font-mono">
                            {target.employeeId}-{employee?.name ?? target.employeeId}
                          </span>

                          {!hasExisting ? (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              Append
                            </span>
                          ) : (
                            <div className="flex items-center gap-3 shrink-0">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`mode-${target.employeeId}`}
                                  checked={target.mode === "append"}
                                  onChange={() => setMode(target.employeeId, "append")}
                                  className="accent-primary"
                                />
                                <span className="text-[10px] text-foreground">Append</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`mode-${target.employeeId}`}
                                  checked={target.mode === "overwrite"}
                                  onChange={() => setMode(target.employeeId, "overwrite")}
                                  className="accent-primary"
                                />
                                <span className="text-[10px] text-foreground">
                                  Overwrite
                                  <span className="text-muted-foreground ml-1">
                                    ({existingCount} existing)
                                  </span>
                                </span>
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCloseAction}>
            Cancel
          </Button>
          <Button
            variant="primary"
            intensity="solid"
            size="sm"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Apply ({checkedTargets.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
