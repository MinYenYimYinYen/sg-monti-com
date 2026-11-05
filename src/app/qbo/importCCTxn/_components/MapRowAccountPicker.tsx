"use client";

import { shallowEqual, useSelector } from "react-redux";
import { AppState } from "@/store";
import { cn } from "@/style/utils";
import { qboAccountSelect } from "@/app/qbo/account/qboAccountSelect";
import { importMapSelect } from "@/app/qbo/importCCTxn/importMapSelect";
import { importCCTxnMappingSelect } from "@/app/qbo/importCCTxn/importCCTxnMappingSelect";
import { importDecisionSelect } from "@/app/qbo/importCCTxn/decisions/importDecisionSelect";
import { useImportDecision } from "@/app/qbo/importCCTxn/decisions/useImportDecision";
import { accountIdsUsedForMerchant } from "@/app/qbo/importCCTxn/_lib/importAccountUtils";
import { suggestAccountIds } from "@/app/qbo/importCCTxn/_lib/importSuggestUtils";
import { OptionPicker } from "@/app/qbo/importCCTxn/_components/OptionPicker";
import { OtherAccountsIndicator } from "@/app/qbo/importCCTxn/_components/OtherAccountsIndicator";

/**
 * The expense account for one transaction. The first account picked in a family becomes the
 * family's default, and the other rows show it at once. A later different pick is this row's own.
 * A saved default for a merchant that has been posted to other accounts gets an outline and the
 * other-accounts indicator, because it could be wrong for this one.
 */
export function MapRowAccountPicker({ rowId }: { rowId: string }) {
  const view = useSelector(
    (state: AppState) => importDecisionSelect.rowView(state, rowId),
    shallowEqual,
  );
  const accountChoices = useSelector(importMapSelect.accountChoices);
  const accountMap = useSelector(qboAccountSelect.accountMap);
  const merchantMappings = useSelector(importCCTxnMappingSelect.merchantMappings);
  const merchantMappingMap = useSelector(importCCTxnMappingSelect.merchantMappingMap);
  const { pickAccount } = useImportDecision();

  if (!view) return null;

  const mapping = merchantMappingMap.get(view.merchantKey) ?? null;
  const suggestedAccountIds = new Set([
    ...suggestAccountIds({ merchantMappings, merchantKey: view.merchantKey }),
    ...(mapping ? accountIdsUsedForMerchant(mapping) : []),
  ]);

  return (
    <div className="flex min-w-52 items-center gap-2 xl:min-w-0">
      <div
        className={cn(
          "min-w-0 flex-1 rounded-md",
          view.isAccountInferred && "bg-secondary/20 p-0.5",
          view.isDefaultAccountWorthALook && "border border-secondary p-0.5",
        )}
      >
        <OptionPicker
          className="w-full"
          options={accountChoices.map((account) => ({
            id: account.Id,
            label: account.FullyQualifiedName,
          }))}
          suggestedIds={suggestedAccountIds}
          value={view.accountId}
          selectedLabel={accountMap.get(view.accountId)?.FullyQualifiedName ?? null}
          placeholder="Expense account"
          onSelectAction={(accountId) =>
            pickAccount({ rowId, merchantKey: view.merchantKey, accountId })
          }
        />
      </div>
      {view.isDefaultAccountWorthALook && <OtherAccountsIndicator mapping={mapping} isCompact />}
    </div>
  );
}
