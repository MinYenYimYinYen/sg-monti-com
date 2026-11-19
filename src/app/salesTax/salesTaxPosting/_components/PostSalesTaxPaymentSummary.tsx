"use client";

import { readMnReturnFile } from "@/app/salesTax/salesTaxPosting/_lib/mnReturnFileReader";
import { describeBalance } from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingPreviewUtils";

/** The facts to check the payment against: the period, what the return says is due, and the books' balance. */
export function PostSalesTaxPaymentSummary({
  periodEnd,
  returnFileText,
  balanceCents,
}: {
  periodEnd: string;
  returnFileText: string;
  balanceCents: number | null;
}) {
  const returnTaxDue = readMnReturnFile(returnFileText).taxDueDollars;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt className="text-muted-foreground">Period</dt>
      <dd>{periodEnd.slice(0, 7)}</dd>
      <dt className="text-muted-foreground">Return tax due</dt>
      <dd>{returnTaxDue === null ? "unreadable" : `$${returnTaxDue.toLocaleString("en-US")}`}</dd>
      <dt className="text-muted-foreground">Sales Tax Payable on {periodEnd}</dt>
      <dd>{balanceCents === null ? "reading from QuickBooks..." : describeBalance(balanceCents)}</dd>
    </dl>
  );
}
