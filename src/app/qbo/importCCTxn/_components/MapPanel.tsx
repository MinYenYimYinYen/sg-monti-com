"use client";

import { useSelector } from "react-redux";
import { importMapSelect } from "@/app/qbo/importCCTxn/importMapSelect";
import { MerchantMapRow } from "@/app/qbo/importCCTxn/_components/MerchantMapRow";

export function MapPanel() {
  const merchantGroups = useSelector(importMapSelect.merchantGroups);
  const unmappedCount = useSelector(importMapSelect.unmappedCount);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        {merchantGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing to map. Import a file first; merchants with pending transactions appear here.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {merchantGroups.length} merchant{merchantGroups.length === 1 ? "" : "s"} with pending
              transactions, {unmappedCount} still to map. Suggestions are highlighted and listed
              first; nothing is chosen for you.
            </p>
            <div className="space-y-3">
              {merchantGroups.map((group) => (
                // The key includes the stored mapping, so a saved row restarts from what was stored.
                <MerchantMapRow
                  key={`${group.merchantKey}:${group.mapping?.vendorId ?? ""}:${group.mapping?.defaultAccountId ?? ""}`}
                  merchantKey={group.merchantKey}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
