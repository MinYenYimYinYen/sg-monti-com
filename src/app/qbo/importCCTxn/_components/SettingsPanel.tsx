"use client";

import { importFormats } from "@/app/qbo/importCCTxn/_lib/importFormatRegistry";
import { FormatAccountEditor } from "@/app/qbo/importCCTxn/_components/FormatAccountEditor";
import { SkippedMerchantsCard } from "@/app/qbo/importCCTxn/_components/SkippedMerchantsCard";

export function SettingsPanel() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <div>
          <div className="text-sm font-semibold text-foreground">Card accounts by bank</div>
          <p className="text-xs text-muted-foreground">
            Choose the QuickBooks credit card account each bank&apos;s transactions post to. If a
            bank has more than one card account, tick them all and mark the default. Posting needs
            this. Only an admin can change it.
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
