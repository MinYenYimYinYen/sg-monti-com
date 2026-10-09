"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { EmployeeListPanel } from "@/app/pace/setup/employees/_components/EmployeeListPanel";
import { EmployeeAssignmentPanel } from "@/app/pace/setup/employees/_components/EmployeeAssignmentPanel";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { assignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";

export function SetupEmployeesPage() {
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  /**
   * Persists group selection state across card re-renders.
   * Map<employeeId, Set<groupId>> — only employees with at least one selection are present.
   */
  const [selectedGroupsByEmployee, setSelectedGroupsByEmployee] = useState<
    Map<string, Set<string>>
  >(new Map());

  const employees = useSelector(employeeSelect.employees);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);

  const selectedSet = new Set(selectedEmployeeIds);

  function handleToggleEmployee(employeeId: string) {
    setSelectedEmployeeIds((prev) => {
      if (prev.includes(employeeId)) return prev.filter((id) => id !== employeeId);
      return [...prev, employeeId];
    });
  }

  function handleSelectAssigned() {
    const activeEmployees = employees.filter((e) => e.active);
    const assignedIds = activeEmployees
      .filter((e) => (assignmentsByEmployeeId.get(e.employeeId)?.groupAssignments.length ?? 0) > 0)
      .map((e) => e.employeeId);
    setSelectedEmployeeIds(assignedIds);
  }

  function handleClearAll() {
    setSelectedEmployeeIds([]);
  }

  function handleToggleGroupSelection(employeeId: string, groupId: string) {
    setSelectedGroupsByEmployee((prev) => {
      const next = new Map(prev);
      const current = new Set(next.get(employeeId) ?? []);
      if (current.has(groupId)) {
        current.delete(groupId);
      } else {
        current.add(groupId);
      }
      if (current.size === 0) {
        next.delete(employeeId);
      } else {
        next.set(employeeId, current);
      }
      return next;
    });
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — employee list, fixed width */}
      <div className="w-60 shrink-0">
        <EmployeeListPanel
          selectedEmployeeIds={selectedSet}
          onToggleEmployee={handleToggleEmployee}
          onSelectAssigned={handleSelectAssigned}
          onClearAll={handleClearAll}
        />
      </div>

      {/* Right panel — wrapping card grid */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {selectedEmployeeIds.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              Select employees from the left panel to edit their assignments.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 p-4 content-start">
            {selectedEmployeeIds.map((employeeId) => (
              <EmployeeAssignmentPanel
                key={employeeId}
                employeeId={employeeId}
                selectedGroupIds={selectedGroupsByEmployee.get(employeeId) ?? new Set()}
                onToggleGroupSelection={(groupId) =>
                  handleToggleGroupSelection(employeeId, groupId)
                }
                otherDisplayedEmployeeIds={selectedEmployeeIds.filter((id) => id !== employeeId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
