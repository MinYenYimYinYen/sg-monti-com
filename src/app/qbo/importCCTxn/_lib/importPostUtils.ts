import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";
import { QboPurchaseCreate } from "@/app/qbo/purchase/types/QboPurchaseTypes";
import { MerchantMapping } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { ImportRow } from "@/app/qbo/importCCTxn/types/ImportRowTypes";

// Pure helpers for posting a row to QuickBooks. Nothing here touches the network or the store.

/** Intuit's DocNumber limit. */
const DOC_NUMBER_MAX_LENGTH = 21;
const MARKER_PREFIX = "SG";
const MARKER_HASH_LENGTH = 12;

/**
 * The Ref no. we put on a posted purchase, derived from the stored row so a retry sends exactly
 * the same value and a purchase can be found again by it. "SG" + 12 hex characters of the row
 * hash + "-" + the occurrence number. Never sent with allowduplicatedocnum, so a repeat is
 * rejected by QuickBooks if it enforces uniqueness (UNVERIFIED: the company setting is off).
 */
export function buildDocNumberMarker({
  rowHash,
  occurrence,
}: {
  rowHash: string;
  occurrence: number;
}): string {
  const marker = `${MARKER_PREFIX}${rowHash.slice(0, MARKER_HASH_LENGTH)}-${occurrence}`;
  if (marker.length > DOC_NUMBER_MAX_LENGTH) {
    throw new Error(`The Ref no. marker "${marker}" is longer than ${DOC_NUMBER_MAX_LENGTH}.`);
  }
  return marker;
}

export type PostCheck = {
  /** Reasons this row must not be posted. Empty means it can be. */
  problems: string[];
  /** Worth showing, but not blocking. */
  warnings: string[];
};

/** Everything the check needs, already looked up, so the check itself is plain logic. */
export type PostCheckInput = {
  row: ImportRow;
  mapping: MerchantMapping | null;
  vendor: QboVendorSummary | null;
  expenseAccount: QboAccount | null;
  cardAccount: QboAccount | null;
  /** YYYY-MM-DD from Preferences, or null when not set. */
  bookCloseDate: string | null;
};

/** Returns every problem at once, so a user fixes them in one pass. */
export function checkRowReadyToPost(input: PostCheckInput): PostCheck {
  const { row, mapping, vendor, expenseAccount, cardAccount, bookCloseDate } = input;
  const problems: string[] = [];
  const warnings: string[] = [];

  // A failed row is certain not to be in QuickBooks, so it may be posted again. An unknown row
  // may be there already and must be reconciled first.
  if (row.status !== "pending" && row.status !== "failed") {
    problems.push(`The row is ${row.status}, so it cannot be posted.`);
  }
  if (row.kind !== "charge") problems.push("Only charges are posted.");
  if (!Number.isInteger(row.amountCents) || row.amountCents <= 0) {
    problems.push("The amount must be greater than zero.");
  }

  if (!mapping) {
    problems.push("The merchant has no vendor and account mapped yet.");
  } else {
    if (!vendor) problems.push("The mapped vendor is not in QuickBooks.");
    else if (!vendor.Active) problems.push(`The vendor "${vendor.DisplayName}" is inactive.`);

    if (!expenseAccount) problems.push("The mapped expense account is not in QuickBooks.");
    else if (!expenseAccount.Active) {
      problems.push(`The expense account "${expenseAccount.FullyQualifiedName}" is inactive.`);
    }
  }

  if (!cardAccount) {
    problems.push("No credit card account is set for this card. Set it in Settings.");
  } else if (!cardAccount.Active) {
    problems.push(`The card account "${cardAccount.FullyQualifiedName}" is inactive.`);
  }

  if (bookCloseDate && row.transactionDate <= bookCloseDate) {
    warnings.push(
      `The transaction date is on or before the books-closed date (${bookCloseDate}). QuickBooks may refuse it.`,
    );
  }

  return { problems, warnings };
}

/** Dollars from whole cents without floating point drift: 9526 becomes 95.26. */
export function centsToAmount(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

/**
 * The credit card purchase for one row. The vendor and accounts must already have passed
 * checkRowReadyToPost. TxnDate is the transaction date, not the posted date.
 */
export function buildPurchaseCreate({
  row,
  vendor,
  expenseAccount,
  cardAccount,
}: {
  row: ImportRow;
  vendor: QboVendorSummary;
  expenseAccount: QboAccount;
  cardAccount: QboAccount;
}): QboPurchaseCreate {
  return {
    PaymentType: "CreditCard",
    AccountRef: { value: cardAccount.Id },
    EntityRef: { value: vendor.Id, type: "Vendor" },
    TxnDate: row.transactionDate,
    DocNumber: buildDocNumberMarker({ rowHash: row.rowHash, occurrence: row.occurrence }),
    Line: [
      {
        DetailType: "AccountBasedExpenseLineDetail",
        Amount: centsToAmount(row.amountCents),
        AccountBasedExpenseLineDetail: { AccountRef: { value: expenseAccount.Id } },
      },
    ],
  };
}
