"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { assignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
import { paceSelect } from "@/app/pace/paceSelect";
import { paceActions } from "@/app/pace/paceSlice";

export function EmployeeListPanel() {
  const dispatch = useAppDispatch();
  const employees = useSelector(employeeSelect.employees);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);
  const selectedEmployeeIds = useSelector(paceSelect.assignmentEditorSelectedEmployeeIds);
  const selectedSet = useSelector(paceSelect.assignmentEditorSelectedEmployeeSet);

  const activeEmployees = employees
    .filter((e) => e.active)
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId));

  function handleToggleEmployee(employeeId: string) {
    const next = selectedSet.has(employeeId)
      ? selectedEmployeeIds.filter((id) => id !== employeeId)
      : [...selectedEmployeeIds, employeeId];
    dispatch(paceActions.setAssignmentEditorSelectedEmployeeIds(next));
  }

  function handleSelectAssigned() {
    const assignedIds = activeEmployees
      .filter((e) => (assignmentsByEmployeeId.get(e.employeeId)?.groupAssignments.length ?? 0) > 0)
      .map((e) => e.employeeId);
    dispatch(paceActions.setAssignmentEditorSelectedEmployeeIds(assignedIds));
  }

  function handleClearAll() {
    dispatch(paceActions.setAssignmentEditorSelectedEmployeeIds([]));
  }

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="shrink-0 px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Employees
        </span>
        {selectedSet.size > 0 && (
          <button
            onClick={handleClearAll}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Select Assigned shortcut */}
      <div className="shrink-0 px-3 py-1.5 border-b border-border">
        <button
          onClick={handleSelectAssigned}
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
          const isSelected = selectedSet.has(employee.employeeId);

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
                onChange={() => handleToggleEmployee(employee.employeeId)}
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
