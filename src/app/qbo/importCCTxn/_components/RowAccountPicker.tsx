"use client";

import { useSelector } from "react-redux";
import { qboAccountSelect } from "@/app/qbo/account/qboAccountSelect";
import { importMapSelect } from "@/app/qbo/importCCTxn/importMapSelect";
import { importCCTxnMappingSelect } from "@/app/qbo/importCCTxn/importCCTxnMappingSelect";
import { useImportRow } from "@/app/qbo/importCCTxn/rows/useImportRow";
import {
  accountIdsUsedForMerchant,
  chooseOverrideAccountId,
  flagsDefaultAccount,
  resolveRowAccountId,
} from "@/app/qbo/importCCTxn/_lib/importAccountUtils";
import { OptionPicker } from "@/app/qbo/importCCTxn/_components/OptionPicker";
import { OtherAccountsIndicator } from "@/app/qbo/importCCTxn/_components/OtherAccountsIndicator";
import { ImportRow } from "@/app/qbo/importCCTxn/types/ImportRowTypes";

/**
 * The expense account one row will post to. It starts as the merchant's default, with the
 * accounts the merchant has been posted to listed first. Choosing another account changes this
 * row only. Choosing the default again clears the row's own choice. Only a row that can still be
 * posted is editable.
 */
export function RowAccountPicker({
  row,
}: {
  row: Pick<ImportRow, "rowId" | "merchantKey" | "accountId" | "status">;
}) {
  const mapping = useSelector(importCCTxnMappingSelect.merchantMappingMap).get(row.merchantKey) ?? null;
  const accountChoices = useSelector(importMapSelect.accountChoices);
  const accountMap = useSelector(qboAccountSelect.accountMap);
  const { setAccount } = useImportRow({ autoLoad: false });

  // Without a mapping there is no vendor or default yet. The Map tab comes first.
  if (!mapping) return null;

  const accountId = resolveRowAccountId({ rowAccountId: row.accountId, mapping }) ?? "";
  const isEditable = row.status === "pending" || row.status === "failed";

  const handleSelect = (selectedAccountId: string) => {
    setAccount({
      rowId: row.rowId,
      accountId: chooseOverrideAccountId({ selectedAccountId, mapping }),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isEditable ? (
        <OptionPicker
          options={accountChoices.map((account) => ({
            id: account.Id,
            label: account.FullyQualifiedName,
          }))}
          suggestedIds={accountIdsUsedForMerchant(mapping)}
          value={accountId}
          selectedLabel={accountMap.get(accountId)?.FullyQualifiedName ?? null}
          placeholder="Expense account"
          onSelectAction={handleSelect}
        />
      ) : (
        <span className="text-sm text-foreground">
          {accountMap.get(accountId)?.FullyQualifiedName ?? accountId}
        </span>
      )}
      {flagsDefaultAccount({ mapping, rowAccountId: row.accountId }) && (
        <OtherAccountsIndicator mapping={mapping} />
      )}
    </div>
  );
}
