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
import { useGroupSequence } from "@/app/pace/groupSequence/useGroupSequence";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { SequenceWithGroups } from "@/app/pace/setup/setupSelect";

type DeleteSequenceDialogProps = {
  sequenceWithGroups: SequenceWithGroups;
  open: boolean;
  onCloseAction: () => void;
};

type AssignmentChoice = "keep" | "remove";

export function DeleteSequenceDialog({
  sequenceWithGroups,
  open,
  onCloseAction,
}: DeleteSequenceDialogProps) {
  const dispatch = useAppDispatch();
  const { deleteSequence } = useGroupSequence();
  const assignmentPlans = useSelector(assignmentPlanSelect.assignmentPlans);
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const assignmentGroupMap = useSelector(paceAssignmentGroupSelect.assignmentGroupMap);

  const [assignmentChoice, setAssignmentChoice] = useState<AssignmentChoice>("keep");

  const groupIds = new Set(sequenceWithGroups.groupIds);

  // Find all employees who have at least one group from this sequence assigned
  type AffectedEmployee = {
    employeeId: string;
    employeeName: string;
    assignedGroupLabels: string[];
  };

  const affectedEmployees: AffectedEmployee[] = assignmentPlans
    .filter((plan) => plan.groupAssignments.some((ga) => groupIds.has(ga.groupId)))
    .map((plan) => ({
      employeeId: plan.employeeId,
      employeeName: employeeMap.get(plan.employeeId)?.name ?? plan.employeeId,
      assignedGroupLabels: plan.groupAssignments
        .filter((ga) => groupIds.has(ga.groupId))
        .map((ga) => assignmentGroupMap.get(ga.groupId)?.label ?? ga.groupId),
    }));

  const hasAffectedEmployees = affectedEmployees.length > 0;

  async function handleConfirm() {
    if (assignmentChoice === "remove" && hasAffectedEmployees) {
      // Remove all groups in this sequence from affected employee plans
      for (const { employeeId } of affectedEmployees) {
        const plan = assignmentPlans.find((p) => p.employeeId === employeeId);
        if (!plan) continue;
        dispatch(
          paceAssignmentPlanActions.reorderGroupAssignments({
            employeeId,
            groupAssignments: plan.groupAssignments.filter((ga) => !groupIds.has(ga.groupId)),
          }),
        );
      }
    }
    // If "keep", assignments remain — groups just become standalone

    await deleteSequence(sequenceWithGroups.sequenceId);
    onCloseAction();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCloseAction(); }}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Delete Sequence?</DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <p className="text-sm text-foreground">
            Permanently remove the{" "}
            <span className="font-semibold text-foreground">{sequenceWithGroups.label}</span>{" "}
            sequence.
          </p>

          <p className="text-xs text-muted-foreground">
            The {sequenceWithGroups.groups.length} ServCode Group{sequenceWithGroups.groups.length !== 1 ? "s" : ""} in this sequence will become standalone groups and continue to work independently. The crawler engine will no longer treat them as a cascade sequence.
          </p>

          {sequenceWithGroups.groups.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {sequenceWithGroups.groups.map((group) => (
                <span
                  key={group.groupId}
                  className="font-mono text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5"
                >
                  {group.label}
                </span>
              ))}
            </div>
          )}

          {hasAffectedEmployees && (
            <div className="rounded border border-secondary/30 bg-secondary/5 p-3 space-y-3">
              <p className="text-xs font-semibold text-secondary">
                ⚠ {affectedEmployees.length} employee{affectedEmployees.length !== 1 ? "s have" : " has"} assignments to ServCode Groups in this sequence. What should happen to those assignments?
              </p>

              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="assignmentChoice"
                    value="keep"
                    checked={assignmentChoice === "keep"}
                    onChange={() => setAssignmentChoice("keep")}
                    className="accent-primary mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="text-xs font-medium text-foreground">Keep assignments</span>
                    <p className="text-[10px] text-muted-foreground">
                      Employees remain assigned to the individual ServCode Groups. Only the sequence relationship is removed. (Recommended)
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="assignmentChoice"
                    value="remove"
                    checked={assignmentChoice === "remove"}
                    onChange={() => setAssignmentChoice("remove")}
                    className="accent-primary mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="text-xs font-medium text-foreground">Remove all assignments</span>
                    <p className="text-[10px] text-muted-foreground">
                      Remove these ServCode Groups from all employee assignment plans.
                    </p>
                  </div>
                </label>
              </div>

              {assignmentChoice === "remove" && (
                <div className="space-y-1 pt-1 border-t border-secondary/20">
                  <p className="text-[10px] font-semibold text-destructive">
                    The following employees will have these groups removed from their plans:
                  </p>
                  <ul className="space-y-0.5">
                    {affectedEmployees.map(({ employeeId, employeeName, assignedGroupLabels }) => (
                      <li key={employeeId} className="text-[10px] text-foreground">
                        <span className="font-medium">{employeeName}</span>
                        <span className="text-muted-foreground">
                          {" "}— {assignedGroupLabels.join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCloseAction}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            intensity="solid"
            size="sm"
            onClick={() => { void handleConfirm(); }}
          >
            Delete Sequence
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
