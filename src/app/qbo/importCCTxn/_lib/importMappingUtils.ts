import {
  CardAssignment,
  FormatAccount,
  IMPORT_SKIP_REASONS,
  MerchantMapping,
  SkipRule,
} from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { ImportFormatId } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";
import { importFormats } from "@/app/qbo/importCCTxn/_lib/importFormatRegistry";
import { buildMerchantKey, collapseDescription } from "@/app/qbo/importCCTxn/_lib/importMerchantKey";

// Pure helpers for the mapping data. Validators return a list of problems (empty means valid),
// so the route can report every problem at once instead of the first one.

export function cardAssignmentKey({
  formatId,
  last4,
}: {
  formatId: ImportFormatId;
  last4: string;
}): string {
  return `${formatId}:${last4}`;
}

function isKnownFormatId(formatId: string): boolean {
  return importFormats.some((format) => format.id === formatId);
}

export function validateFormatAccount(formatAccount: FormatAccount): string[] {
  const problems: string[] = [];
  if (!isKnownFormatId(formatAccount.formatId)) {
    problems.push(`Unknown format "${formatAccount.formatId}".`);
  }
  if (formatAccount.accountIds.length === 0) {
    problems.push("At least one account is required.");
  }
  if (new Set(formatAccount.accountIds).size !== formatAccount.accountIds.length) {
    problems.push("The same account is listed more than once.");
  }
  if (!formatAccount.accountIds.includes(formatAccount.defaultAccountId)) {
    problems.push("The default account must be one of the format's accounts.");
  }
  return problems;
}

/** `formatAccount` is the stored mapping for the card's format, if there is one. */
export function validateCardAssignment({
  cardAssignment,
  formatAccount,
}: {
  cardAssignment: CardAssignment;
  formatAccount: FormatAccount | null;
}): string[] {
  const problems: string[] = [];
  if (!isKnownFormatId(cardAssignment.formatId)) {
    problems.push(`Unknown format "${cardAssignment.formatId}".`);
  }
  if (!/^\d{4}$/.test(cardAssignment.last4)) {
    problems.push("Card number must be the last 4 digits.");
  }
  if (!cardAssignment.userName.trim()) {
    problems.push("A responsible user is required.");
  }
  if (cardAssignment.accountId) {
    if (!formatAccount) {
      problems.push("Set the format's accounts before choosing an account override.");
    } else if (!formatAccount.accountIds.includes(cardAssignment.accountId)) {
      problems.push("The account override must be one of the format's accounts.");
    }
  }
  return problems;
}

export function validateMerchantMapping(merchantMapping: MerchantMapping): string[] {
  const problems: string[] = [];
  if (!merchantMapping.merchantKey.trim()) problems.push("Merchant key is required.");
  if (!merchantMapping.vendorId) problems.push("A vendor is required.");
  if (!merchantMapping.defaultAccountId) problems.push("A default account is required.");
  if (merchantMapping.otherAccountIds.includes(merchantMapping.defaultAccountId)) {
    problems.push("The default account should not also be listed as an other account.");
  }
  // A confirmation is only meaningful for a description that belongs to this merchant's family,
  // and it is stored in the collapsed form so the same description is never listed twice.
  for (const confirmed of merchantMapping.confirmedMerchants) {
    if (confirmed !== collapseDescription(confirmed) || confirmed.length === 0) {
      problems.push(`Confirmed description "${confirmed}" is not in its collapsed form.`);
    } else if (buildMerchantKey(confirmed) !== merchantMapping.merchantKey) {
      problems.push(`Confirmed description "${confirmed}" does not belong to this merchant.`);
    }
  }
  return problems;
}

export function validateSkipRule(skipRule: SkipRule): string[] {
  const problems: string[] = [];
  if (!skipRule.merchantKey.trim()) problems.push("Merchant key is required.");
  if (!IMPORT_SKIP_REASONS.includes(skipRule.reason)) {
    problems.push(`Unknown skip reason "${skipRule.reason}".`);
  }
  return problems;
}

/**
 * The QBO credit card account a card's rows post to: the card's own override, else the format
 * default. Null when the format has no account mapping yet.
 */
export function resolveCardAccountId({
  cardAssignment,
  formatAccount,
}: {
  cardAssignment: CardAssignment | undefined;
  formatAccount: FormatAccount | undefined;
}): string | null {
  if (cardAssignment?.accountId) return cardAssignment.accountId;
  return formatAccount ? formatAccount.defaultAccountId : null;
}
