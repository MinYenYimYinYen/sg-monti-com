"use client";

import { RenewalSettingsPanel } from "./RenewalSettingsPanel";
import { RenewalBatchesPanel } from "./RenewalBatchesPanel";

export function RenewalLettersPage() {
  return (
    <div className="flex h-full min-h-0">
      <div className="w-80 shrink-0 h-full overflow-y-auto border-r border-border bg-card">
        <RenewalSettingsPanel />
      </div>
      <div className="flex-1 min-w-0 h-full overflow-y-auto">
        <RenewalBatchesPanel />
      </div>
    </div>
  );
}
