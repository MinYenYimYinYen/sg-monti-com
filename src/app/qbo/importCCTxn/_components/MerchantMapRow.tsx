"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import { AppState } from "@/store";
import { qboVendorSelect } from "@/app/qbo/vendor/qboVendorSelect";
import { qboAccountSelect } from "@/app/qbo/account/qboAccountSelect";
import { importMapSelect } from "@/app/qbo/importCCTxn/importMapSelect";
import { importCCTxnMappingSelect } from "@/app/qbo/importCCTxn/importCCTxnMappingSelect";
import { useImportCCTxnMapping } from "@/app/qbo/importCCTxn/useImportCCTxnMapping";
import { formatCents } from "@/app/qbo/importCCTxn/_lib/importFileUtils";
import { buildMerchantMappingToSave } from "@/app/qbo/importCCTxn/_lib/importMapUtils";
import {
  suggestAccountIds,
  suggestVendorIds,
  suggestVendorIdsFromMappings,
} from "@/app/qbo/importCCTxn/_lib/importSuggestUtils";
import { OptionPicker } from "@/app/qbo/importCCTxn/_components/OptionPicker";

/**
 * Maps one merchant to a vendor and an expense account. Key it on merchantKey and pass only
 * the key: the row reads its group and the QuickBooks lists itself.
 */
export function MerchantMapRow({ merchantKey }: { merchantKey: string }) {
  const group = useSelector((state: AppState) =>
    importMapSelect.merchantGroupMap(state).get(merchantKey),
  );
  const vendorChoices = useSelector(importMapSelect.vendorChoices);
  const accountChoices = useSelector(importMapSelect.accountChoices);
  const vendorMap = useSelector(qboVendorSelect.vendorMap);
  const accountMap = useSelector(qboAccountSelect.accountMap);
  const merchantMappings = useSelector(importCCTxnMappingSelect.merchantMappings);
  const { saveMerchantMapping } = useImportCCTxnMapping({ autoLoad: false });

  // Local picks start from the stored mapping. Saving only happens when both are chosen.
  const [vendorId, setVendorId] = useState(group?.mapping?.vendorId ?? "");
  const [accountId, setAccountId] = useState(group?.mapping?.defaultAccountId ?? "");

  if (!group) return null;

  const suggestedVendorIds = new Set([
    ...suggestVendorIds({ vendors: vendorChoices, merchantKey }),
    ...suggestVendorIdsFromMappings({ merchantMappings, merchantKey }),
  ]);
  const suggestedAccountIds = suggestAccountIds({ merchantMappings, merchantKey });

  const isChanged =
    vendorId !== (group.mapping?.vendorId ?? "") ||
    accountId !== (group.mapping?.defaultAccountId ?? "");
  const canSave = vendorId !== "" && accountId !== "" && (isChanged || group.problem !== null);

  const handleSave = () => {
    saveMerchantMapping(
      buildMerchantMappingToSave({
        merchantKey,
        vendorId,
        accountId,
        existing: group.mapping,
      }),
    );
  };

  return (
    <div className="space-y-2 rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <div className="font-mono text-sm font-semibold text-foreground">{group.description}</div>
          <div className="text-xs text-muted-foreground">
            {group.rowCount} transaction{group.rowCount === 1 ? "" : "s"},{" "}
            {formatCents(group.totalCents)}
          </div>
        </div>

        <OptionPicker
          options={vendorChoices.map((vendor) => ({ id: vendor.Id, label: vendor.DisplayName }))}
          suggestedIds={suggestedVendorIds}
          value={vendorId}
          selectedLabel={vendorMap.get(vendorId)?.DisplayName ?? null}
          placeholder="Vendor"
          onSelectAction={setVendorId}
        />

        <OptionPicker
          options={accountChoices.map((account) => ({
            id: account.Id,
            label: account.FullyQualifiedName,
          }))}
          suggestedIds={suggestedAccountIds}
          value={accountId}
          selectedLabel={accountMap.get(accountId)?.FullyQualifiedName ?? null}
          placeholder="Expense account"
          onSelectAction={setAccountId}
        />

        <Button variant="primary" disabled={!canSave} onClick={handleSave}>
          Save
        </Button>

        {group.status === "mapped" && !isChanged && (
          <Badge variant="accent" intensity="soft">
            Mapped
          </Badge>
        )}
      </div>

      {group.problem && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {group.problem}
        </div>
      )}
    </div>
  );
}
