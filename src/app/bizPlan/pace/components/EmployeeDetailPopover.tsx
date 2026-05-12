"use client";

import { useSelector } from "react-redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelectRefactor";
import { EmployeePaceDetail } from "@/app/bizPlan/pace/components/EmployeePaceDetail";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";

type EmployeeDetailPopoverProps = {
  employeeId: string;
  children: React.ReactNode;
};

export function EmployeeDetailPopover({
  employeeId,
  children,
}: EmployeeDetailPopoverProps) {
  const cardDatas = useSelector(paceSelect.employeeCardData);
  const cardData = cardDatas.find(
    (c) => c.employee.employeeId === employeeId,
  );

  if (!cardData) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start" side="right">
        <EmployeePaceDetail cardData={cardData} />
      </PopoverContent>
    </Popover>
  );
}
