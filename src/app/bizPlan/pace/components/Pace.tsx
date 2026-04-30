"use client";

import { usePaceDeps } from "@/app/bizPlan/pace/usePaceDeps";
import { PaceListPanel } from "@/app/bizPlan/pace/components/PaceListPanel";
import { PaceDetailPanel } from "@/app/bizPlan/pace/components/PaceDetailPanel";

export function Pace() {
  usePaceDeps();

  return (
    <div className="flex gap-4 h-full p-4">
      <PaceListPanel />
      <div className="flex-1 min-w-0">
        <PaceDetailPanel />
      </div>
    </div>
  );
}
