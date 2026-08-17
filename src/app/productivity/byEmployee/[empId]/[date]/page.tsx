"use client";

import { use } from "react";
import { DayTimeline } from "@/app/productivity/_components/DayTimeline";

type Params = { empId: string; date: string };

export default function ByEmployeeDayPage({ params }: { params: Promise<Params> }) {
  const { empId, date } = use(params);
  return (
    <DayTimeline
      empId={empId}
      date={date}
      backHref={`/productivity/byEmployee/${empId}`}
    />
  );
}
