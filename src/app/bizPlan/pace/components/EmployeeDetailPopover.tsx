"use client";

import { useSelector } from "react-redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { EmployeePaceDetail } from "@/app/bizPlan/pace/components/EmployeePaceDetail";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";

type EmployeeDetailPopoverProps = {
  employeeId: string;
  programType: string | null;
  children: React.ReactNode;
};

export function EmployeeDetailPopover({
  employeeId,
  programType,
  children,
}: EmployeeDetailPopoverProps) {
  const summaries = useSelector(paceSelect.employeePaceSummaries);
  const summary = summaries.find(
    (s) => s.employee.employeeId === employeeId && s.programType === programType,
  );

  if (!summary) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start" side="right">
        <EmployeePaceDetail summary={summary} />
      </PopoverContent>
    </Popover>
  );
}
