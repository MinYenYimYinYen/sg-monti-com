"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { EmployeeShare } from "@/app/bizPlan/pace/PaceType";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { EmployeePaceRow } from "@/app/bizPlan/pace/components/EmployeePaceRow";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { Checkbox } from "@/style/components/checkbox";
import { Button } from "@/style/components/button";
import { ChevronDown } from "lucide-react";

type AssignmentEditorProps = {
  servCode: ServCodeDeep;
  employeeShares: EmployeeShare[];
};

export function AssignmentEditor({ servCode, employeeShares }: AssignmentEditorProps) {
  const { upsert } = useAssignmentPlan({ autoLoad: false });
  const allEmployees = useSelector(employeeSelect.employees);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);
  const [open, setOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const assignedIds = new Set(servCode.assignedTo.map((e) => e.employeeId));

  // Only show active employees not already assigned
  const availableEmployees = allEmployees.filter(
    (e) => e.active && !assignedIds.has(e.employeeId),
  );

  function handleRemove(employeeId: string) {
    // Remove this servCode from the employee's servCodeIds list
    const existingPlan = assignmentsByEmployeeId.get(employeeId);
    const updatedServCodeIds = (existingPlan?.servCodeIds ?? []).filter(
      (id) => id !== servCode.servCodeId,
    );
    upsert({ employeeId, servCodeIds: updatedServCodeIds });
  }

  function togglePending(employee: Employee) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(employee.employeeId)) {
        next.delete(employee.employeeId);
      } else {
        next.add(employee.employeeId);
      }
      return next;
    });
  }

  function handleConfirm() {
    // For each newly added employee, append this servCode to their existing plan
    for (const employeeId of pendingIds) {
      const existingPlan = assignmentsByEmployeeId.get(employeeId);
      const updatedServCodeIds = [
        ...(existingPlan?.servCodeIds ?? []),
        servCode.servCodeId,
      ];
      upsert({ employeeId, servCodeIds: updatedServCodeIds });
    }
    setPendingIds(new Set());
    setOpen(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setPendingIds(new Set());
    setOpen(nextOpen);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
        Assigned employees
      </p>

      {employeeShares.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No employees assigned</p>
      ) : (
        <div className="divide-y divide-border">
          {employeeShares.map((share) => (
            <EmployeePaceRow
              key={share.employee.employeeId}
              share={share}
              programType={servCode.progCode.programType ?? null}
              onRemoveAction={handleRemove}
            />
          ))}
        </div>
      )}

      {availableEmployees.length > 0 && (
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="accent"
              intensity="ghost"
              size="sm"
              className="self-start h-7 text-xs gap-1"
            >
              Add employee
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {availableEmployees.map((employee) => (
                <label
                  key={employee.employeeId}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/10 cursor-pointer"
                >
                  <Checkbox
                    checked={pendingIds.has(employee.employeeId)}
                    onCheckedChange={() => togglePending(employee)}
                  />
                  <span className="text-sm text-foreground">{employee.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t flex justify-end">
              <Button
                size="sm"
                variant="primary"
                intensity="solid"
                disabled={pendingIds.size === 0}
                onClick={handleConfirm}
                className="h-7 text-xs"
              >
                Add {pendingIds.size > 0 ? `(${pendingIds.size})` : ""}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
