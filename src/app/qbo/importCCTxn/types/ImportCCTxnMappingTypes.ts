import { ImportFormatId } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";

// Our own stored data, kept as one plain type per shape (no Doc/Props layering in src/app/qbo).
// QBO references are held as Intuit `Id` strings; the vendor and account are resolved in selectors.

export const IMPORT_SKIP_REASONS = ["inventoryPurchase"] as const;
export type ImportSkipReason = (typeof IMPORT_SKIP_REASONS)[number];

/** The only user fields the browser gets, for choosing who is responsible for a card. */
export type AssignableUser = {
  userName: string;
  firstName: string;
  lastName: string;
};

/** Natural key: formatId. Which QBO credit card accounts a bank format can post to. */
export type FormatAccount = {
  formatId: ImportFormatId;
  /** QBO account Ids. A format usually has one, but may have several. */
  accountIds: string[];
  /** Must be one of accountIds. */
  defaultAccountId: string;
};

/** Natural key: formatId + last4. Every last4 in a file must have one before import. */
export type CardAssignment = {
  formatId: ImportFormatId;
  last4: string;
  /** The site user responsible for this card. */
  userName: string;
  cardholderName?: string;
  /** Overrides the format's default account for this card; must be one of its accountIds. */
  accountId?: string;
};

/**
 * Natural key: merchantKey + ownerUserName. A null owner applies to everyone; per-user rules are
 * not built yet but the field is here so they can be added without a migration.
 */
export type MerchantMapping = {
  merchantKey: string;
  ownerUserName: string | null;
  vendorId: string;
  defaultAccountId: string;
  /** Other expense accounts this merchant has been posted to; offered first in the dropdown. */
  otherAccountIds: string[];
};

/** Natural key: merchantKey. "Always skip this merchant". */
export type SkipRule = {
  merchantKey: string;
  reason: ImportSkipReason;
};
