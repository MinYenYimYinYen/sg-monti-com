"use client";

import { PunchImportPanel } from "@/app/timeCard/import/_components/PunchImportPanel";

export default function TimeCardImportPage() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <PunchImportPanel />
    </div>
  );
}
