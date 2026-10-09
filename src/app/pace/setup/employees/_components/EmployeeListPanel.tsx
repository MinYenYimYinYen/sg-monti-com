"use client";

import { useSelector } from "react-redux";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { assignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";

type EmployeeListPanelProps = {
  selectedEmployeeIds: Set<string>;
  onToggleEmployee: (employeeId: string) => void;
  onSelectAssigned: () => void;
  onClearAll: () => void;
};

export function EmployeeListPanel({
  selectedEmployeeIds,
  onToggleEmployee,
  onSelectAssigned,
  onClearAll,
}: EmployeeListPanelProps) {
  const employees = useSelector(employeeSelect.employees);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);

  const activeEmployees = employees
    .filter((e) => e.active)
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId));

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="shrink-0 px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Employees
        </span>
        {selectedEmployeeIds.size > 0 && (
          <button
            onClick={onClearAll}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Select Assigned shortcut */}
      <div className="shrink-0 px-3 py-1.5 border-b border-border">
        <button
          onClick={onSelectAssigned}
          className="text-[10px] bg-accent/20 hover:bg-accent/30 rounded px-1.5 py-0.5 transition-colors w-full text-left"
        >
          Select Assigned
        </button>
      </div>

      {/* Employee list */}
      <div className="flex-1 overflow-y-auto py-1">
        {activeEmployees.map((employee) => {
          const plan = assignmentsByEmployeeId.get(employee.employeeId);
          const assignedCount = plan?.groupAssignments.length ?? 0;
          const isSelected = selectedEmployeeIds.has(employee.employeeId);

          return (
            <label
              key={employee.employeeId}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                isSelected
                  ? "bg-primary/15 text-primary"
                  : "text-foreground hover:bg-accent/10"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleEmployee(employee.employeeId)}
                className="accent-primary shrink-0"
              />
              <span className="truncate flex-1 font-mono">
                {employee.employeeId}-{employee.name}
              </span>
              {assignedCount > 0 && (
                <span
                  className={`text-[10px] shrink-0 font-mono ${
                    isSelected ? "text-primary/70" : "text-muted-foreground"
                  }`}
                >
                  {assignedCount}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
