"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { ChevronLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { assignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
import { paceAssignmentPlanActions } from "@/app/pace/assignmentPlan/assignmentPlanSlice";
import { EmployeeAssignmentPanel } from "@/app/pace/setup/employees/_components/EmployeeAssignmentPanel";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";

type AddEmployeeToGroupDialogProps = {
  group: AssignmentGroup;
  open: boolean;
  onCloseAction: () => void;
};

export function AddEmployeeToGroupDialog({
  group,
  open,
  onCloseAction,
}: AddEmployeeToGroupDialogProps) {
  const dispatch = useAppDispatch();
  const employees = useSelector(employeeSelect.employees);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);

  // employeeId of the employee currently being shown in the panel (step 2)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Employees not yet assigned to this group, sorted by employeeId
  const assignedSet = new Set(group.assignedEmployeeIds);
  const eligibleEmployees = employees
    .filter((e) => e.active && !assignedSet.has(e.employeeId))
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId));

  function handleSelectEmployee(employeeId: string) {
    // Append the group to the employee's assignment list before showing the panel
    const existingPlan = assignmentsByEmployeeId.get(employeeId);
    const existingAssignments = existingPlan?.groupAssignments ?? [];
    const alreadyAssigned = existingAssignments.some((ga) => ga.groupId === group.groupId);

    if (!alreadyAssigned) {
      dispatch(
        paceAssignmentPlanActions.reorderGroupAssignments({
          employeeId,
          groupAssignments: [
            ...existingAssignments,
            { groupId: group.groupId, dailyRevenueGoal: null },
          ],
        }),
      );
    }

    setSelectedEmployeeId(employeeId);
  }

  function handleBack() {
    setSelectedEmployeeId(null);
  }

  const selectedEmployee = selectedEmployeeId
    ? employees.find((e) => e.employeeId === selectedEmployeeId)
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCloseAction(); }}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedEmployeeId && (
              <button
                onClick={handleBack}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                title="Back to employee list"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <span>Add Employee —</span>
            <span className="font-mono text-primary">{group.label}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {selectedEmployeeId && selectedEmployee ? (
            /* Step 2: Show the full EmployeeAssignmentPanel for reordering */
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground">
                {group.label} has been added to {selectedEmployee.name}&apos;s assignments.
                Drag to reorder priority.
              </p>
              <EmployeeAssignmentPanel
                employeeId={selectedEmployeeId}
                selectedGroupIds={new Set()}
                onToggleGroupSelection={() => undefined}
                otherDisplayedEmployeeIds={[]}
              />
              <div className="flex justify-end pt-1">
                <Button
                  variant="primary"
                  intensity="solid"
                  size="sm"
                  onClick={onCloseAction}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            /* Step 1: Employee picker */
            <div className="max-h-80 overflow-y-auto space-y-0">
              {eligibleEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  All active employees are already assigned to this group.
                </p>
              ) : (
                eligibleEmployees.map((employee) => (
                  <button
                    key={employee.employeeId}
                    onClick={() => handleSelectEmployee(employee.employeeId)}
                    className="w-full flex items-center gap-2 px-3 py-1 rounded hover:bg-accent/10 transition-colors text-left"
                  >
                    <span className="text-xs text-foreground flex-1 truncate font-mono">
                      {employee.employeeId}-{employee.name}
                    </span>
                    {(() => {
                      const plan = assignmentsByEmployeeId.get(employee.employeeId);
                      const count = plan?.groupAssignments.length ?? 0;
                      return count > 0 ? (
                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                          {count}
                        </span>
                      ) : null;
                    })()}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
