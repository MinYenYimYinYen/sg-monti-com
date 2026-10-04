"use client";

import { useSelector } from "react-redux";
import { employeePlanSelect } from "@/app/pace/employeePlanSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { holidaySelect } from "@/app/holiday/holidaySelect";
import { EmployeeCard } from "@/app/pace/_components/EmployeeCard";

export function EmployeePlanPage() {
  const employeePlanData = useSelector(employeePlanSelect.employeePlanData);
  const mainDate = useSelector(employeePlanSelect.mainDate);
  const holidays = useSelector(holidaySelect.all);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  const matchingHoliday =
    holidays.find((h) => mainDate >= h.dateRange.min && mainDate <= h.dateRange.max) ?? null;
  const holidayDescription = matchingHoliday?.description ?? null;
  const isWeatherDay = matchingHoliday?.isWeatherDay ?? false;

  const sorted = [...employeePlanData].sort((a, b) => {
    const nameA = employeeMap.get(a.employeeId)?.name ?? a.employeeId;
    const nameB = employeeMap.get(b.employeeId)?.name ?? b.employeeId;
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex flex-row flex-wrap gap-4 content-start">
        {sorted.map((data) => (
          <EmployeeCard
            key={data.employeeId}
            data={data}
            mainDate={mainDate}
            holidayDescription={holidayDescription}
            isWeatherDay={isWeatherDay}
          />
        ))}
        {sorted.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No assigned employees found. Configure assignments first.
          </p>
        )}
      </div>
    </div>
  );
}
