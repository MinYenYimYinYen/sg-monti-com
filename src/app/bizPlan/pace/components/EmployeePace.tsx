"use client";

import { useSelector } from "react-redux";
import { usePaceDeps } from "@/app/bizPlan/pace/usePaceDeps";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { EmployeePaceListPanel } from "@/app/bizPlan/pace/components/EmployeePaceListPanel";
import { EmployeeCard } from "@/app/bizPlan/pace/components/EmployeeCard";
import { Button } from "@/style/components/button";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { authSelect } from "@/app/auth/authSlice";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";

export function EmployeePace() {
  usePaceDeps();

  const employeeCardData = useSelector(paceSelect.employeeCardData);
  const unsavedServCodeChanges = useSelector(progServSelect.unsavedServCodeChanges);
  const isAdmin = useSelector(authSelect.role) === "admin";
  const { saveServCodeChanges } = useProgServ({});

  const dateRangeChanges = unsavedServCodeChanges.filter(
    (c) =>
      c.updated.dateRange.min !== c.original.dateRange.min ||
      c.updated.dateRange.max !== c.original.dateRange.max,
  );

  return (
    <div className="flex gap-4 h-full p-4">
      {/* Left panel — date slider + flag filter */}
      <EmployeePaceListPanel />

      {/* Card grid */}
      <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-hidden">
        {isAdmin && (
          <div className="flex items-center justify-start shrink-0">
            <Button
              disabled={dateRangeChanges.length === 0}
              onClick={() => saveServCodeChanges(dateRangeChanges)}
            >
              Save All Date Range Changes
            </Button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {employeeCardData.length === 0 ? (
            <div className="flex items-center justify-center h-full border-2 border-dashed border-muted rounded-lg">
              <p className="text-muted-foreground text-sm">
                No employees have assignments yet
              </p>
            </div>
          ) : (
            <div className="flex flex-row flex-wrap gap-4 content-start">
              {employeeCardData.map((cardData) => (
                <EmployeeCard
                  key={cardData.employee.employeeId}
                  cardData={cardData}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
