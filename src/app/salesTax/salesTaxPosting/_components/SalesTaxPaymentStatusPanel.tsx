"use client";

import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { salesTaxPostingSelect } from "@/app/salesTax/salesTaxPosting/salesTaxPostingSelect";
import { describeCents } from "@/app/salesTax/salesTaxPosting/_lib/salesTaxMoneyUtils";
import { JournalEntryPosting } from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";

const POSTING_STATUS_TEXT: Record<JournalEntryPosting["status"], string> = {
  pending: "saved, not sent",
  posting: "sending, no answer yet",
  posted: "posted",
  failed: "rejected by QuickBooks",
  unknown: "outcome unknown, check QuickBooks",
};

function PostingLine({ label, posting }: { label: string; posting: JournalEntryPosting }) {
  return (
    <li>
      <span className="font-medium">{label}</span> {posting.docNumber} on {posting.txnDate}:{" "}
      {describeCents(posting.totalCents)}, {POSTING_STATUS_TEXT[posting.status]}
      {posting.postMessage && posting.status !== "posted" ? ` (${posting.postMessage})` : ""}
    </li>
  );
}

/**
 * What our own records say about this month's payment: the two entries and the files on the
 * payment. It renders nothing until something has been saved. The retry button only attaches
 * missing files; it never creates an entry.
 */
export function SalesTaxPaymentStatusPanel({
  periodEnd,
  canRetry,
  onRetryAction,
}: {
  periodEnd: string;
  canRetry: boolean;
  onRetryAction: () => void;
}) {
  const paymentStatus = useSelector(salesTaxPostingSelect.paymentStatus);
  const retryStatus = useSelector(salesTaxPostingSelect.retryStatus);
  const retryProblems = useSelector(salesTaxPostingSelect.lastRetryProblems);

  if (!paymentStatus || paymentStatus.periodEnd !== periodEnd) return null;
  const { payment, adjustment, attachments } = paymentStatus;
  if (!payment && !adjustment) return null;

  const filesMissing =
    payment?.status === "posted" && attachments.some((file) => file.status !== "uploaded");

  return (
    <section className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 text-sm">
      <h3 className="font-semibold">Already saved for this month</h3>
      <ul className="list-disc space-y-1 pl-5">
        {adjustment && <PostingLine label="Adjustment" posting={adjustment} />}
        {payment && <PostingLine label="Payment" posting={payment} />}
      </ul>
      {attachments.length > 0 && (
        <ul className="list-disc space-y-1 pl-5">
          {attachments.map((file) => (
            <li key={file.fileName}>
              {file.fileName}: {file.status}
              {file.message && file.status !== "uploaded" ? ` (${file.message})` : ""}
            </li>
          ))}
        </ul>
      )}
      {filesMissing && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canRetry || retryStatus === "pending"}
            onClick={onRetryAction}
          >
            Retry files
          </Button>
          <span className="text-xs text-muted-foreground">
            Checks QuickBooks first, so a file that is already there is not sent again.
          </span>
        </div>
      )}
      {retryProblems.length > 0 && (
        <ul className="list-disc pl-5 text-secondary">
          {retryProblems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
