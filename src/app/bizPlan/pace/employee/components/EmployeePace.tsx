"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { usePaceDeps } from "@/app/bizPlan/pace/usePaceDeps";
import { paceSelect } from "@/app/bizPlan/pace/paceSelectRefactor";
import { employeePaceActions } from "@/app/bizPlan/pace/employee/employeePaceSlice";
import { EmployeeCard } from "@/app/bizPlan/pace/employee/components/EmployeeCard";
import { UrgentServCodeCard } from "@/app/bizPlan/pace/employee/components/UrgentServCodeCard";
import { Button } from "@/style/components/button";
import { Toggle } from "@/style/components/toggle";
import { CalendarClock, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { authSelect } from "@/app/auth/authSlice";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { DatePicker } from "@/components/DatePicker";

export function EmployeePace() {
  usePaceDeps();

  const dispatch = useAppDispatch();
  const employeeCardData = useSelector(paceSelect.employeeCardData);
  const latestAssignmentDate = useSelector(paceSelect.latestAssignmentDate);
  const mainDate = useSelector(paceSelect.mainDate);
  const unsavedServCodeChanges = useSelector(progServSelect.unsavedServCodeChanges);
  const isAdmin = useSelector(authSelect.role) === "admin";
  const showUpcoming = useSelector(paceSelect.showUpcoming);
  const { saveServCodeChanges } = useProgServ({});

  const dateRangeChanges = unsavedServCodeChanges.filter(
    (c) =>
      c.updated.dateRange.min !== c.original.dateRange.min ||
      c.updated.dateRange.max !== c.original.dateRange.max,
  );

  return (
    <div className="flex gap-4 h-full p-4">
      {/* Card grid */}
      <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-hidden">
        {isAdmin && (
          <div className="flex items-center justify-between shrink-0">
            <Button
              disabled={dateRangeChanges.length === 0}
              onClick={() => saveServCodeChanges(dateRangeChanges)}
            >
              Save All Date Range Changes
            </Button>
            <DatePicker
              value={mainDate}
              onChange={(date) => dispatch(employeePaceActions.setMainDate(date))}
            />
            <div className="flex items-center gap-2">
              <Toggle
                pressed={showUpcoming}
                onPressedChange={() => dispatch(employeePaceActions.toggleShowUpcoming())}
                aria-label="Show upcoming servCodes"
                size="sm"
              >
                <CalendarClock className="w-4 h-4" />
                Upcoming
              </Toggle>
              <Button variant="secondary" intensity="soft" size="sm" asChild>
                <Link href="/bizPlan/assignmentPlan/matrix">
                  <LayoutGrid className="w-4 h-4" />
                  Matrix
                </Link>
              </Button>
            </div>
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
              <UrgentServCodeCard />
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
