"use client";

import { useSelector } from "react-redux";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { EmployeeShare } from "@/app/bizPlan/pace/PaceType";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { EmployeePaceRow } from "@/app/bizPlan/pace/components/EmployeePaceRow";
import EntitySelector from "@/components/EntitySelector";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";

type AssignmentEditorProps = {
  servCode: ServCodeDeep;
  employeeShares: EmployeeShare[];
};

export function AssignmentEditor({ servCode, employeeShares }: AssignmentEditorProps) {
  const { upsert } = useAssignmentPlan({ autoLoad: false });
  const allEmployees = useSelector(employeeSelect.employees);

  const assignedIds = new Set(servCode.assignedTo.map((e) => e.employeeId));

  // Only show active employees not already assigned
  const availableEmployees = allEmployees.filter(
    (e) => e.active && !assignedIds.has(e.employeeId),
  );

  function handleAdd(_id: string, employee: Employee) {
    const updatedIds = [...servCode.assignedTo.map((e) => e.employeeId), employee.employeeId];
    upsert({ servCodeId: servCode.servCodeId, employeeIds: updatedIds });
  }

  function handleRemove(employeeId: string) {
    const updatedIds = servCode.assignedTo
      .map((e) => e.employeeId)
      .filter((id) => id !== employeeId);
    upsert({ servCodeId: servCode.servCodeId, employeeIds: updatedIds });
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
              onRemoveAction={handleRemove}
            />
          ))}
        </div>
      )}

      {availableEmployees.length > 0 && (
        <EntitySelector
          items={availableEmployees}
          getItemId={(e) => e.employeeId}
          getItemLabel={(e) => e.name}
          onValueChange={handleAdd}
          placeholder="Add employee..."
          triggerClassName="h-7 text-xs"
        />
      )}
    </div>
  );
}
