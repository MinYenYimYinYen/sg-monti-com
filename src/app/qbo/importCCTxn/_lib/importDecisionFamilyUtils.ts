import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";
import { MerchantMapping } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { ImportRow } from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import {
  DecisionDraft,
  DecisionSource,
  FamilyDecisionView,
} from "@/app/qbo/importCCTxn/types/ImportDecisionTypes";

// Pure logic for the merchant family behind the Map tab's selectors. A family has one effective
// mapping. Its vendor is the one picked this session if there is a pick, otherwise the saved one.
// A row's source then says where its value came from:
//   chosen   this row's own pick
//   stored   the saved mapping, which nothing this session has changed
//   inferred another row's pick put the value on this family, so this row was not looked at
//   none     nothing yet
// A pick on a row whose family has a saved mapping turns the siblings from stored into inferred,
// because the saved vendor no longer applies to them.

export type FamilyInput = {
  merchantKey: string;
  rows: ImportRow[];
  mapping: MerchantMapping | null;
};

export function isUsableExpenseAccount(account: QboAccount | undefined): boolean {
  return account !== undefined && account.Active && account.Classification === "Expense";
}

export function describeVendorProblem({
  vendorId,
  vendorMap,
}: {
  vendorId: string;
  vendorMap: Map<string, QboVendorSummary>;
}): string | null {
  const vendor = vendorMap.get(vendorId);
  if (!vendor) return "The vendor is not in QuickBooks. Pick another.";
  if (!vendor.Active) return `The vendor "${vendor.DisplayName}" is inactive. Pick another.`;
  return null;
}

export function describeAccountProblem({
  accountId,
  accountMap,
}: {
  accountId: string;
  accountMap: Map<string, QboAccount>;
}): string | null {
  const account = accountMap.get(accountId);
  if (!account) return "The account is not in QuickBooks. Pick another.";
  if (!account.Active) return `The account "${account.FullyQualifiedName}" is inactive. Pick another.`;
  if (!isUsableExpenseAccount(account)) {
    return `The account "${account.FullyQualifiedName}" is not an expense account. Pick another.`;
  }
  return null;
}

export function groupRowsIntoFamilies({
  pendingRows,
  merchantMappingMap,
}: {
  pendingRows: ImportRow[];
  merchantMappingMap: Map<string, MerchantMapping>;
}): FamilyInput[] {
  const familiesByKey = new Map<string, FamilyInput>();
  for (const row of pendingRows) {
    const family = familiesByKey.get(row.merchantKey);
    if (family) {
      family.rows.push(row);
    } else {
      familiesByKey.set(row.merchantKey, {
        merchantKey: row.merchantKey,
        rows: [row],
        mapping: merchantMappingMap.get(row.merchantKey) ?? null,
      });
    }
  }
  return [...familiesByKey.values()];
}

/**
 * Picks made on a skipped row, or in a family that is always skipped, do not count: a skipped row
 * makes no decision. They stay in the draft, so unskipping brings them back.
 */
export function liveDraft(draft: DecisionDraft): DecisionDraft {
  const skippedRowIds = new Set(draft.skippedRowIds);
  const alwaysSkipKeys = new Set(draft.alwaysSkipMerchantKeys);
  const isLive = ({ rowId, merchantKey }: { rowId: string; merchantKey: string }) =>
    !skippedRowIds.has(rowId) && !alwaysSkipKeys.has(merchantKey);
  return {
    ...draft,
    vendorPicks: draft.vendorPicks.filter(isLive),
    accountPicks: draft.accountPicks.filter(isLive),
    confirmedRows: draft.confirmedRows.filter(isLive),
  };
}

export function buildFamilyView({
  family,
  live,
  isAlwaysSkip,
}: {
  family: FamilyInput;
  live: DecisionDraft;
  isAlwaysSkip: boolean;
}): FamilyDecisionView {
  const vendorPick = live.vendorPicks.find((pick) => pick.merchantKey === family.merchantKey);
  // The first pick in the list is the default for a family with nothing saved.
  const firstAccountPick = live.accountPicks.find((pick) => pick.merchantKey === family.merchantKey);

  return {
    merchantKey: family.merchantKey,
    hasMapping: family.mapping !== null,
    vendorId: vendorPick?.vendorId ?? family.mapping?.vendorId ?? null,
    isVendorFromDraft: vendorPick !== undefined,
    defaultAccountId: family.mapping?.defaultAccountId ?? firstAccountPick?.accountId ?? null,
    isDefaultAccountFromDraft: family.mapping === null && firstAccountPick !== undefined,
    isAlwaysSkip,
    pendingCount: family.rows.length,
  };
}

export function resolveVendor({
  row,
  family,
  live,
}: {
  row: ImportRow;
  family: FamilyDecisionView;
  live: DecisionDraft;
}): { vendorId: string; source: DecisionSource } {
  if (family.vendorId === null) return { vendorId: "", source: "none" };
  const hasOwnPick = live.vendorPicks.some((pick) => pick.rowId === row.rowId);
  if (hasOwnPick) return { vendorId: family.vendorId, source: "chosen" };
  return { vendorId: family.vendorId, source: family.isVendorFromDraft ? "inferred" : "stored" };
}

export function resolveAccount({
  row,
  family,
  live,
}: {
  row: ImportRow;
  family: FamilyDecisionView;
  live: DecisionDraft;
}): { accountId: string; source: DecisionSource } {
  const ownPick = live.accountPicks.find((pick) => pick.rowId === row.rowId);
  if (ownPick) return { accountId: ownPick.accountId, source: "chosen" };
  // An account saved on this one row (from the Post tab) is its own choice, already looked at.
  if (row.accountId) return { accountId: row.accountId, source: "stored" };
  if (family.defaultAccountId === null) return { accountId: "", source: "none" };
  return {
    accountId: family.defaultAccountId,
    source: family.isDefaultAccountFromDraft ? "inferred" : "stored",
  };
}
