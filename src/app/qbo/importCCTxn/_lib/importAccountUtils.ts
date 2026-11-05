import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { MerchantMapping } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";

// Pure helpers for the expense account a row posts to. A merchant has a default account and a
// growing list of other accounts it has been posted to. A single row can override the default.

type MappingAccounts = Pick<MerchantMapping, "defaultAccountId" | "otherAccountIds">;

/** The accounts a dropdown may offer: active ones only. */
export function pickActiveAccounts(accounts: QboAccount[]): QboAccount[] {
  return accounts.filter((account) => account.Active);
}

/**
 * The expense account a row posts to: the row's own choice if it has one, else the merchant's
 * default. Null when the merchant has no mapping and the row has no choice.
 */
export function resolveRowAccountId({
  rowAccountId,
  mapping,
}: {
  rowAccountId: string | undefined;
  mapping: Pick<MerchantMapping, "defaultAccountId"> | null;
}): string | null {
  if (rowAccountId) return rowAccountId;
  return mapping ? mapping.defaultAccountId : null;
}

/**
 * What to store when a person picks an account for one row. Picking the merchant's default
 * clears the override (null), so a row never carries a choice that only repeats the default.
 */
export function chooseOverrideAccountId({
  selectedAccountId,
  mapping,
}: {
  selectedAccountId: string;
  mapping: Pick<MerchantMapping, "defaultAccountId">;
}): string | null {
  return selectedAccountId === mapping.defaultAccountId ? null : selectedAccountId;
}

/**
 * True while the default was filled in automatically and the merchant has been posted to other
 * accounts, so the default may be wrong for this one. A row with its own choice is not flagged:
 * a person already looked at it.
 */
export function flagsDefaultAccount({
  mapping,
  rowAccountId,
}: {
  mapping: Pick<MerchantMapping, "otherAccountIds"> | null;
  rowAccountId: string | undefined;
}): boolean {
  if (!mapping || rowAccountId) return false;
  return mapping.otherAccountIds.length > 0;
}

/**
 * Whether a posted account should be added to the merchant's other accounts: only when it is
 * neither the default nor already listed. This is done after a successful post, so the list
 * holds only accounts that were really used.
 */
export function shouldRememberAccount({
  mapping,
  postedAccountId,
}: {
  mapping: MappingAccounts | null;
  postedAccountId: string;
}): boolean {
  if (!mapping) return false;
  return (
    postedAccountId !== mapping.defaultAccountId && !mapping.otherAccountIds.includes(postedAccountId)
  );
}

/** The merchant's default first, then the other accounts. These are listed first in the dropdown. */
export function accountIdsUsedForMerchant(mapping: MappingAccounts): Set<string> {
  return new Set([mapping.defaultAccountId, ...mapping.otherAccountIds]);
}

/** Names of the other accounts, for the indicator's tooltip. An account QuickBooks no longer lists shows by id. */
export function describeOtherAccounts({
  mapping,
  accountMap,
}: {
  mapping: Pick<MerchantMapping, "otherAccountIds"> | null;
  accountMap: Map<string, QboAccount>;
}): string[] {
  if (!mapping) return [];
  return mapping.otherAccountIds.map(
    (accountId) => accountMap.get(accountId)?.FullyQualifiedName ?? `Account ${accountId}`,
  );
}
