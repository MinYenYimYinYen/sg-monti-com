"use client";

import { importFormats } from "@/app/qbo/importCCTxn/_lib/importFormatRegistry";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { importCCTxnCapabilities } from "@/app/qbo/importCCTxn/importCCTxnCapabilities";
import { FormatAccountEditor } from "@/app/qbo/importCCTxn/_components/FormatAccountEditor";
import { SkippedMerchantsCard } from "@/app/qbo/importCCTxn/_components/SkippedMerchantsCard";

// The card accounts are the one stored list this tab edits, so its read gates the tab. The skipped
// merchants card below reads the skip rules the layout already loads.
export function SettingsPanel() {
  return (
    <GatedPanel requirement={importCCTxnCapabilities.can.formatAccounts.read}>
      <SettingsWorkspace />
    </GatedPanel>
  );
}

function SettingsWorkspace() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <div>
          <div className="text-sm font-semibold text-foreground">Card accounts by bank</div>
          <p className="text-xs text-muted-foreground">
            Choose the QuickBooks credit card account each bank&apos;s transactions post to. If a
            bank has more than one card account, tick them all and mark the default. Posting needs
            this. Changing it needs its own permission.
          </p>
        </div>
        {importFormats.map((format) => (
          <FormatAccountEditor key={format.id} formatId={format.id} label={format.label} />
        ))}
        <SkippedMerchantsCard />
      </div>
    </div>
  );
}
