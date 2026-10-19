"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { EmployeeListPanel } from "@/app/pace/setup/employees/_components/EmployeeListPanel";
import { EmployeeAssignmentPanel } from "@/app/pace/setup/employees/_components/EmployeeAssignmentPanel";
import { paceSelect } from "@/app/pace/paceSelect";
import { paceActions } from "@/app/pace/paceSlice";

export function SetupEmployeesPage() {
  const dispatch = useAppDispatch();
  const selectedEmployeeIds = useSelector(paceSelect.assignmentEditorSelectedEmployeeIds);
  const selectedGroupSetsByEmployee = useSelector(paceSelect.setupSelectedGroupSetsByEmployee);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — employee list, fixed width */}
      <div className="w-60 shrink-0">
        <EmployeeListPanel />
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
                selectedGroupIds={selectedGroupSetsByEmployee.get(employeeId) ?? new Set()}
                otherDisplayedEmployeeIds={selectedEmployeeIds.filter((id) => id !== employeeId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
