"use client";

import { LatestBanner } from "@/app/javelin/_lib/components/LatestBanner";
import { DepositHeader } from "@/app/javelin/_lib/components/DepositHeader";
import { DepositDropZone } from "@/app/javelin/_lib/components/DepositDropZone";
import { DepositResultsTable } from "@/app/javelin/_lib/components/DepositResultsTable";

export function DepositsPanel() {
  return (
    <div className="flex flex-col h-full px-4 py-4 sm:px-6 lg:px-8">
      <LatestBanner kind="deposit" />
      <DepositHeader />
      <DepositDropZone />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <DepositResultsTable />
      </div>
    </div>
  );
}
