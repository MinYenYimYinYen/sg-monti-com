"use client";

import { useSelector } from "react-redux";
import { cn } from "@/style/utils";
import { EmployeePlanData } from "@/app/pace/employeePlan/employeePlanSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { GroupRow } from "@/app/pace/employeePlan/GroupRow";
import { getAvailabilityStatus } from "@/app/pace/employeePlan/employeePlanHelpers";

export function EmployeeCard({
  data,
  mainDate,
  holidayDescription,
  isWeatherDay,
}: {
  data: EmployeePlanData;
  mainDate: string;
  holidayDescription: string | null;
  isWeatherDay: boolean;
}) {
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const employee = employeeMap.get(data.employeeId);
  if (!employee) return null;

  const availStatus = getAvailabilityStatus(employee.availability, mainDate);
  const isUnavailable = availStatus.kind !== "available";
  const isOnLeave = employee.plannedTimeOff.some(
    (pto) => mainDate >= pto.dateRange.min && mainDate <= pto.dateRange.max,
  );

  const headerBg = isUnavailable ? "bg-primary/10" : "bg-accent/10";
  const groupsWithWork = data.groups.filter((g) => g.hasWork);

  return (
    <div className="border rounded-lg bg-card w-72 flex flex-col">
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b rounded-t-lg",
          headerBg,
        )}
      >
        <span
          className={cn(
            "text-sm font-semibold truncate",
            isUnavailable ? "text-primary/60" : "text-foreground",
          )}
        >
          {employee.name}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {availStatus.kind === "not_started" && (
            <span className="text-primary/70 text-xs font-medium">🚫 Not Started</span>
          )}
          {availStatus.kind === "ended" && (
            <span className="text-primary/70 text-xs font-medium">🚫 Ended</span>
          )}
          {availStatus.kind === "available" && (
            <>
              {isOnLeave && (
                <span className="text-destructive text-xs font-medium">🏖 On Leave</span>
              )}
              {holidayDescription && (
                <span className="text-destructive text-xs font-medium">
                  {isWeatherDay ? "🌧" : "🎉"} {holidayDescription}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 px-3 py-2">
        {availStatus.kind !== "available" ? (
          <p className="text-xs text-muted-foreground italic py-2">
            {availStatus.kind === "not_started"
              ? `Starts ${availStatus.startDate}`
              : `Ended ${availStatus.endDate}`}
          </p>
        ) : groupsWithWork.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No open groups on this date
          </p>
        ) : (
          <div className="py-1">
            {groupsWithWork.map((row, index) => (
              <GroupRow key={row.groupId} row={row} isFirst={index === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
