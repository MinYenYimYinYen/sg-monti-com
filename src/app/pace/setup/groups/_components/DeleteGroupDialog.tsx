"use client";

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
import { usePaceAssignmentGroup } from "@/app/pace/assignmentGroup/useAssignmentGroup";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";

type DeleteGroupDialogProps = {
  group: AssignmentGroup;
  open: boolean;
  onCloseAction: () => void;
  /** Called after successful deletion so the parent can clear selection if needed. */
  onDeletedAction?: () => void;
};

export function DeleteGroupDialog({
  group,
  open,
  onCloseAction,
  onDeletedAction,
}: DeleteGroupDialogProps) {
  const dispatch = useAppDispatch();
  const { deleteGroup } = usePaceAssignmentGroup();
  const assignmentPlans = useSelector(assignmentPlanSelect.assignmentPlans);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  // Find employees who have this group assigned, with their priority rank
  const affectedEmployees = assignmentPlans
    .filter((plan) => plan.groupAssignments.some((ga) => ga.groupId === group.groupId))
    .map((plan) => ({
      employeeId: plan.employeeId,
      employeeName: employeeMap.get(plan.employeeId)?.name ?? plan.employeeId,
      priority: plan.groupAssignments.findIndex((ga) => ga.groupId === group.groupId) + 1,
    }))
    .sort((a, b) => a.priority - b.priority);

  async function handleConfirm() {
    // Remove this group from all affected employee assignment plans
    for (const { employeeId } of affectedEmployees) {
      const plan = assignmentPlans.find((p) => p.employeeId === employeeId);
      if (!plan) continue;
      dispatch(
        paceAssignmentPlanActions.reorderGroupAssignments({
          employeeId,
          groupAssignments: plan.groupAssignments.filter((ga) => ga.groupId !== group.groupId),
        }),
      );
    }

    await deleteGroup(group.groupId);
    onDeletedAction?.();
    onCloseAction();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCloseAction(); }}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Delete ServCode Group?</DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <p className="text-sm text-foreground">
            Permanently remove ServCode Group{" "}
            <span className="font-mono font-semibold text-primary">{group.label}</span>
            {group.servCodeIds.length > 0 && (
              <span className="text-muted-foreground">
                {" "}(ServCodes: {group.servCodeIds.join(", ")})
              </span>
            )}
            .
          </p>

          {affectedEmployees.length > 0 ? (
            <div className="rounded border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-destructive">
                ⚠ {affectedEmployees.length} employee{affectedEmployees.length !== 1 ? "s have" : " has"} this ServCode Group assigned — their assignment plans will be updated:
              </p>
              <ul className="space-y-0.5">
                {affectedEmployees.map(({ employeeId, employeeName, priority }) => (
                  <li key={employeeId} className="text-xs text-foreground flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground w-6 text-right shrink-0">
                      #{priority}
                    </span>
                    <span>{employeeName}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No employees have this ServCode Group assigned.
            </p>
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
            Delete ServCode Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
