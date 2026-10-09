"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { paceAssignmentPlanActions } from "@/app/pace/assignmentPlan/assignmentPlanSlice";
import { assignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { formatGoal } from "@/app/pace/assignments/_components/assignmentsHelpers";
import Link from "next/link";

type GroupGoalsDialogProps = {
  group: AssignmentGroup;
  open: boolean;
  onCloseAction: () => void;
};

/**
 * Edit daily revenue goals for all employees assigned to a specific group.
 * Changes are staged in Redux — user must save the scenario via PaceScenarioSelector.
 */
export function GroupGoalsDialog({ group, open, onCloseAction }: GroupGoalsDialogProps) {
  const dispatch = useAppDispatch();
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const isDirty = useSelector(assignmentPlanSelect.isDirty);

  const { assignedEmployeeIds, goalsByEmployee, label } = group;

  function handleGoalChange(employeeId: string, value: string) {
    if (value.trim() === "") {
      dispatch(paceAssignmentPlanActions.setGoal({ employeeId, groupId: group.groupId, dailyRevenueGoal: null }));
      return;
    }
    const n = parseFloat(value);
    if (!isNaN(n) && n >= 0) {
      dispatch(paceAssignmentPlanActions.setGoal({ employeeId, groupId: group.groupId, dailyRevenueGoal: n }));
    }
  }

  let teamTotal = 0;
  for (const employeeId of assignedEmployeeIds) {
    const goal = goalsByEmployee.get(employeeId) ?? null;
    if (goal !== null) teamTotal += goal;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCloseAction(); }}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Goals —</span>
            <span className="font-mono text-primary">{label}</span>
            {isDirty && (
              <span className="text-[9px] text-secondary font-semibold uppercase tracking-wide ml-auto">
                unsaved
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {assignedEmployeeIds.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-muted-foreground">No employees assigned to this group.</p>
              <Link
                href="/pace/setup/employees"
                className="text-xs text-primary hover:underline"
                onClick={onCloseAction}
              >
                Go to Employees tab →
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {assignedEmployeeIds.map((employeeId) => {
                const employee = employeeMap.get(employeeId);
                const goal = goalsByEmployee.get(employeeId) ?? null;
                return (
                  <div
                    key={employeeId}
                    className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-accent/5"
                  >
                    <span className="text-xs text-foreground flex-1 truncate">
                      {employee?.name ?? employeeId}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">$</span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={formatGoal(goal)}
                        onChange={(e) => handleGoalChange(employeeId, e.target.value)}
                        placeholder="goal"
                        className="w-20 h-6 text-xs px-1.5 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                      <span className="text-[10px] text-muted-foreground">/day</span>
                    </div>
                  </div>
                );
              })}

              {/* Team total */}
              <div className="flex items-center justify-between px-2 py-1.5 border-t border-border/50 mt-2">
                <span className="text-xs font-medium text-foreground">Team total</span>
                <span className="text-xs font-mono font-semibold text-foreground">
                  {teamTotal > 0 ? `$${Math.round(teamTotal).toLocaleString()}/day` : "—"}
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
