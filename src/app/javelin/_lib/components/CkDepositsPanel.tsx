"use client";

import { LatestBanner } from "@/app/javelin/_lib/components/LatestBanner";
import { CkDepositHeader } from "@/app/javelin/_lib/components/CkDepositHeader";
import { CkDepositRows } from "@/app/javelin/_lib/components/CkDepositRows";
import { CkDepositResults } from "@/app/javelin/_lib/components/CkDepositResults";

export function CkDepositsPanel() {
  return (
    <div className="flex flex-col h-full px-4 py-4 sm:px-6 lg:px-8">
      <LatestBanner kind="ckDeposit" />
      <CkDepositHeader />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <CkDepositRows />
        <CkDepositResults />
      </div>
    </div>
  );
}
