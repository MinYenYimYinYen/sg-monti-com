"use client";
import { use } from "react";
import { useSelector } from "react-redux";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";

type RouteDatePageProps = {
  params: Promise<{
    routeDate: string;
  }>;
};

export default function RouteDatePage({ params }: RouteDatePageProps) {
  const { routeDate } = use(params);
  const servicesByDateAndEmployee = useSelector(coverSheetsSelect.servicesByDateAndEmployee)
  const serviceByEmployee  = servicesByDateAndEmployee.get(routeDate)
  return (
    <div>
      <div>{routeDate}</div>
    </div>
  );
}
