import {
  DecisionDraft,
  DecisionFailure,
} from "@/app/qbo/importCCTxn/types/ImportDecisionTypes";

// Pure transitions of the Map tab's draft. The reducers are thin wrappers around these.

export const emptyDraft: DecisionDraft = {
  vendorPicks: [],
  accountPicks: [],
  confirmedRows: [],
  skippedRowIds: [],
  alwaysSkipMerchantKeys: [],
};

export function hasDraftChanges(draft: DecisionDraft): boolean {
  return (
    draft.vendorPicks.length > 0 ||
    draft.accountPicks.length > 0 ||
    draft.confirmedRows.length > 0 ||
    draft.skippedRowIds.length > 0 ||
    draft.alwaysSkipMerchantKeys.length > 0
  );
}

/**
 * A vendor pick sets the vendor for the whole family, so a family holds one vendor at a time:
 * picks for a different vendor are dropped, and those rows now read as inferred. Picking the
 * vendor that is already saved means "no change", so the family's picks are cleared.
 */
export function pickVendorInDraft({
  draft,
  rowId,
  merchantKey,
  vendorId,
  storedVendorId,
}: {
  draft: DecisionDraft;
  rowId: string;
  merchantKey: string;
  vendorId: string;
  storedVendorId: string | null;
}): DecisionDraft {
  const otherFamilyPicks = draft.vendorPicks.filter((pick) => pick.merchantKey !== merchantKey);
  if (storedVendorId !== null && vendorId === storedVendorId) {
    return { ...draft, vendorPicks: otherFamilyPicks };
  }

  const sameVendorPicks = draft.vendorPicks.filter(
    (pick) => pick.merchantKey === merchantKey && pick.vendorId === vendorId && pick.rowId !== rowId,
  );
  return {
    ...draft,
    vendorPicks: [...otherFamilyPicks, ...sameVendorPicks, { rowId, merchantKey, vendorId }],
  };
}

/**
 * An account pick keeps its place in the list when a row picks again, because the first pick in
 * a family without a saved default is that family's default, and it follows the row that made it.
 */
export function pickAccountInDraft({
  draft,
  rowId,
  merchantKey,
  accountId,
}: {
  draft: DecisionDraft;
  rowId: string;
  merchantKey: string;
  accountId: string;
}): DecisionDraft {
  const pick = { rowId, merchantKey, accountId };
  const existingIndex = draft.accountPicks.findIndex((existing) => existing.rowId === rowId);
  const accountPicks =
    existingIndex === -1
      ? [...draft.accountPicks, pick]
      : draft.accountPicks.map((existing, index) => (index === existingIndex ? pick : existing));
  return { ...draft, accountPicks };
}

export function setRowSkippedInDraft({
  draft,
  rowId,
  isSkipped,
}: {
  draft: DecisionDraft;
  rowId: string;
  isSkipped: boolean;
}): DecisionDraft {
  const others = draft.skippedRowIds.filter((skippedId) => skippedId !== rowId);
  return { ...draft, skippedRowIds: isSkipped ? [...others, rowId] : others };
}

export function setAlwaysSkipInDraft({
  draft,
  merchantKey,
  isAlwaysSkip,
}: {
  draft: DecisionDraft;
  merchantKey: string;
  isAlwaysSkip: boolean;
}): DecisionDraft {
  const others = draft.alwaysSkipMerchantKeys.filter((key) => key !== merchantKey);
  return { ...draft, alwaysSkipMerchantKeys: isAlwaysSkip ? [...others, merchantKey] : others };
}

export function setRowConfirmedInDraft({
  draft,
  rowId,
  merchantKey,
  vendorId,
  isConfirmed,
}: {
  draft: DecisionDraft;
  rowId: string;
  merchantKey: string;
  vendorId: string;
  isConfirmed: boolean;
}): DecisionDraft {
  const others = draft.confirmedRows.filter((confirmed) => confirmed.rowId !== rowId);
  return {
    ...draft,
    confirmedRows: isConfirmed ? [...others, { rowId, merchantKey, vendorId }] : others,
  };
}

/**
 * What is left of the draft after a save. A part the server refused stays, so the person can see
 * it and fix it; everything that was saved leaves the draft.
 */
export function clearSavedFromDraft({
  draft,
  failures,
}: {
  draft: DecisionDraft;
  failures: DecisionFailure[];
}): DecisionDraft {
  if (failures.length === 0) return emptyDraft;

  const failedKeys = new Set(failures.flatMap((failure) => (failure.merchantKey ? [failure.merchantKey] : [])));
  const failedRowIds = new Set(failures.flatMap((failure) => (failure.rowId ? [failure.rowId] : [])));
  const isKept = ({ rowId, merchantKey }: { rowId: string; merchantKey: string }) =>
    failedKeys.has(merchantKey) || failedRowIds.has(rowId);

  return {
    vendorPicks: draft.vendorPicks.filter(isKept),
    accountPicks: draft.accountPicks.filter(isKept),
    confirmedRows: draft.confirmedRows.filter(isKept),
    skippedRowIds: draft.skippedRowIds.filter((rowId) => failedRowIds.has(rowId)),
    alwaysSkipMerchantKeys: draft.alwaysSkipMerchantKeys.filter((key) => failedKeys.has(key)),
  };
}
