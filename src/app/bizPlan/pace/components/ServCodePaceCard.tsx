"use client";

import { ServCodePace } from "@/app/bizPlan/pace/PaceType";
import { ServCodeHeader } from "@/app/bizPlan/pace/components/ServCodeHeader";
import { PaceRateDisplay } from "@/app/bizPlan/pace/components/PaceRateDisplay";
import { DateRangeEditor } from "@/app/bizPlan/pace/components/DateRangeEditor";
import { AssignmentEditor } from "@/app/bizPlan/pace/components/AssignmentEditor";

type ServCodePaceCardProps = {
  pace: ServCodePace;
};

export function ServCodePaceCard({ pace }: ServCodePaceCardProps) {
  return (
    <div className="border rounded-lg p-4 flex flex-col gap-4 bg-card">
      <ServCodeHeader servCode={pace.servCode} category={pace.category} />
      <DateRangeEditor
        servCodeId={pace.servCode.servCodeId}
        dateRange={pace.servCode.dateRange}
      />
      <PaceRateDisplay unfinishedRate={pace.unfinishedRate} />
      <AssignmentEditor
        servCode={pace.servCode}
        employeeShares={pace.employeeShares}
      />
    </div>
  );
}
