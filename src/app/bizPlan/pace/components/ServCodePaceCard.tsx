"use client";

import { ServCodePace } from "@/app/bizPlan/pace/PaceType";
import { ServCodeHeader } from "@/app/bizPlan/pace/components/ServCodeHeader";
import { PaceRateDisplay } from "@/app/bizPlan/pace/components/PaceRateDisplay";
import { AssignmentEditor } from "@/app/bizPlan/pace/components/AssignmentEditor";

type ServCodePaceCardProps = {
  pace: ServCodePace;
};

export function ServCodePaceCard({ pace }: ServCodePaceCardProps) {
  return (
    <div className="border rounded-lg p-4 flex flex-col gap-2 bg-card w-3xl">
      <ServCodeHeader pace={pace} />
      <PaceRateDisplay unfinishedRate={pace.unfinishedRate} />
      <AssignmentEditor
        servCode={pace.servCode}
        employeeShares={pace.employeeShares}
      />
    </div>
  );
}
