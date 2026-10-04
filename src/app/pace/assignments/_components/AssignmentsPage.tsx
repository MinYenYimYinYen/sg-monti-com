"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { paceAssignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
import { paceActions } from "@/app/pace/paceSlice";
import { PaceAssignmentGroupManager } from "@/app/pace/assignments/_components/PaceAssignmentGroupManager";
import { GroupSequencePanel } from "@/app/pace/assignments/_components/GroupSequencePanel";
import { EmployeeAssignmentCard } from "@/app/pace/assignments/_components/EmployeeAssignmentCard";
import { selectSelectedEmployeeIds } from "@/app/pace/assignments/_components/assignmentsHelpers";

export function AssignmentsPage() {
  const dispatch = useAppDispatch();
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const assignmentsByEmployeeId = useSelector(paceAssignmentPlanSelect.assignmentsByEmployeeId);
  const selectedEmployeeIdsArr = useSelector(selectSelectedEmployeeIds);
  const selectedEmployeeIds = new Set(selectedEmployeeIdsArr);

  const activeEmployees = [...employeeMap.values()].filter((e) => e.active);

  function toggleEmployee(employeeId: string) {
    const next = new Set(selectedEmployeeIds);
    next.has(employeeId) ? next.delete(employeeId) : next.add(employeeId);
    dispatch(paceActions.setAssignmentEditorSelectedEmployeeIds([...next]));
  }

  function selectAssigned() {
    const assignedIds = activeEmployees
      .filter(
        (e) => (assignmentsByEmployeeId.get(e.employeeId)?.groupAssignments.length ?? 0) > 0,
      )
      .map((e) => e.employeeId);
    dispatch(paceActions.setAssignmentEditorSelectedEmployeeIds(assignedIds));
  }

  function clearAll() {
    dispatch(paceActions.setAssignmentEditorSelectedEmployeeIds([]));
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sequences panel — leftmost */}
      <div className="w-52 shrink-0 border-r flex flex-col bg-card">
        <GroupSequencePanel />
      </div>

      {/* Groups panel */}
      <div className="w-64 shrink-0 border-r flex flex-col bg-card">
        <PaceAssignmentGroupManager />
      </div>

      {/* Middle panel — Employee selector */}
      <div className="w-48 shrink-0 border-r flex flex-col bg-card">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Employees
          </span>
          <button
            onClick={clearAll}
            className="text-[10px] text-muted-foreground hover:underline"
          >
            Clear
          </button>
        </div>
        <div className="px-3 py-1.5 border-b">
          <button
            onClick={selectAssigned}
            className="text-[10px] bg-accent/20 hover:bg-accent/30 rounded px-1.5 py-0.5 transition-colors w-full text-left"
          >
            Select Assigned
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {activeEmployees.map((employee) => {
            const plan = assignmentsByEmployeeId.get(employee.employeeId);
            const assignedCount = plan?.groupAssignments.length ?? 0;
            return (
              <label
                key={employee.employeeId}
                className="flex items-center gap-2 px-3 py-1 text-xs cursor-pointer hover:bg-accent/10"
              >
                <input
                  type="checkbox"
                  checked={selectedEmployeeIds.has(employee.employeeId)}
                  onChange={() => toggleEmployee(employee.employeeId)}
                  className="accent-primary"
                />
                <span className="text-foreground truncate flex-1">{employee.name}</span>
                {assignedCount > 0 && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{assignedCount}</span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Right panel — Assignment cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {selectedEmployeeIds.size === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Select employees from the left panel to edit their assignments.
          </p>
        )}
        {[...selectedEmployeeIds].map((employeeId) => (
          <EmployeeAssignmentCard key={employeeId} employeeId={employeeId} />
        ))}
      </div>
    </div>
  );
}
