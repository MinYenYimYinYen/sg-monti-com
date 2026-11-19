import { JournalEntryPosting } from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { QboAccountBalance } from "@/app/qbo/balanceSheet/types/QboBalanceSheetTypes";
import { DepositFieldLink } from "@/app/javelin/depositMapping/DepositFieldMappingTypes";
import { SalesTaxPaymentStatus } from "@/app/salesTax/salesTaxPosting/SalesTaxPostingTypes";

// Pure. What the dialog decides from the links and the stored record of the month, so it can be
// tested.

/** The links the payment cannot use yet. "unverified" only means QuickBooks accounts have not loaded. */
export function findBlockedLinks(links: DepositFieldLink[]): DepositFieldLink[] {
  return links.filter((link) => link.status !== "mapped" && link.status !== "unverified");
}

/** The QuickBooks Id of the payable account, once its link resolves to an active account. */
export function findPayableAccountId(links: DepositFieldLink[]): string | null {
  const payable = links.find((link) => link.field === "salesTaxPayableAccount");
  return payable?.status === "mapped" ? (payable.qboAccount?.Id ?? null) : null;
}

/** The held balance for the payable account on the period end, or null while it is being read. */
export function findHeldBalanceCents({
  balances,
  accountId,
  asOfDate,
}: {
  balances: QboAccountBalance[];
  accountId: string | null;
  asOfDate: string;
}): number | null {
  if (!accountId) return null;
  const held = balances.find(
    (balance) => balance.accountId === accountId && balance.asOfDate === asOfDate,
  );
  return held ? held.balanceCents : null;
}

/** The stored record, only when it is for this period. */
export function storedStatusForPeriod({
  paymentStatus,
  periodEnd,
}: {
  paymentStatus: SalesTaxPaymentStatus | null;
  periodEnd: string;
}): SalesTaxPaymentStatus | null {
  return paymentStatus?.periodEnd === periodEnd ? paymentStatus : null;
}

/** A payment that was sent and not rejected is never sent again, so the dialog must not offer to. */
export function isPaymentSettled(payment: JournalEntryPosting | null | undefined): boolean {
  if (!payment) return false;
  return payment.status !== "pending" && payment.status !== "failed";
}

/**
 * The post button's rule: the user may write, the report is loaded, the amount is usable, nothing
 * has been sent for this month yet, the accounts are linked, and no post is already running.
 */
export function canPostPayment({
  canWrite,
  hasTaxReport,
  amountIsUsable,
  paymentIsSettled,
  hasBlockedLinks,
  isPosting,
}: {
  canWrite: boolean;
  hasTaxReport: boolean;
  amountIsUsable: boolean;
  paymentIsSettled: boolean;
  hasBlockedLinks: boolean;
  isPosting: boolean;
}): boolean {
  return (
    canWrite && hasTaxReport && amountIsUsable && !paymentIsSettled && !hasBlockedLinks && !isPosting
  );
}
