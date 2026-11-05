"use client";

import { useSelector } from "react-redux";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import { importCCTxnMappingSelect } from "@/app/qbo/importCCTxn/importCCTxnMappingSelect";
import { useImportCCTxnMapping } from "@/app/qbo/importCCTxn/useImportCCTxnMapping";
import { skipReasonLabels } from "@/app/qbo/importCCTxn/_lib/importFileUtils";

/**
 * The merchants that are always skipped. Removing a rule only affects future imports: rows that
 * were already skipped stay skipped, and can be restored one at a time on the Post tab.
 */
export function SkippedMerchantsCard() {
  const skipRules = useSelector(importCCTxnMappingSelect.sortedSkipRules);
  const { deleteSkipRule } = useImportCCTxnMapping({ autoLoad: false });

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-4">
      <div>
        <div className="text-sm font-semibold text-foreground">Skipped merchants</div>
        <p className="text-xs text-muted-foreground">
          Transactions from these merchants are stored as skipped and never posted. Add one with
          &quot;Always skip&quot; on the Map tab. Removing a rule only changes future imports; rows
          already skipped stay skipped until you restore them on the Post tab.
        </p>
      </div>

      {skipRules.length === 0 ? (
        <p className="text-xs text-muted-foreground">No merchants are always skipped.</p>
      ) : (
        <ul className="divide-y divide-border">
          {skipRules.map((skipRule) => (
            <li key={skipRule.merchantKey} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
                {skipRule.merchantKey}
              </span>
              <Badge variant="secondary" intensity="soft">
                {skipReasonLabels[skipRule.reason]}
              </Badge>
              <Button
                variant="destructive"
                intensity="soft"
                onClick={() => deleteSkipRule(skipRule.merchantKey)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
