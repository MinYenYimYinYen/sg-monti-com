"use client";

import { useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { Alert, AlertDescription, AlertTitle } from "@/style/components/alert";
import { Button } from "@/style/components/button";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { qboConst } from "@/app/qbo/_lib/qboConst";
import { useQboAccount } from "@/app/qbo/account/useQboAccount";
import { qboBalanceSheetSelect } from "@/app/qbo/balanceSheet/qboBalanceSheetSelect";
import { useQboBalanceSheet } from "@/app/qbo/balanceSheet/useQboBalanceSheet";
import { DEPOSIT_LINK_LABELS } from "@/app/javelin/_lib/ckDepositFields";
import { depositFieldMappingSelect } from "@/app/javelin/depositMapping/depositFieldMappingSelect";
import { useDepositFieldMapping } from "@/app/javelin/depositMapping/useDepositFieldMapping";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { buildTaxCodeReportCsv } from "@/app/salesTax/_lib/buildTaxCodeReportCsv";
import { salesTaxUISelect } from "@/app/salesTax/salesTaxUISelect";
import { PaymentAmountField } from "@/app/salesTax/salesTaxPosting/_components/PaymentAmountField";
import { PostResultNotices } from "@/app/salesTax/salesTaxPosting/_components/PostResultNotices";
import { PostSalesTaxPaymentSummary } from "@/app/salesTax/salesTaxPosting/_components/PostSalesTaxPaymentSummary";
import { SalesTaxPaymentStatusPanel } from "@/app/salesTax/salesTaxPosting/_components/SalesTaxPaymentStatusPanel";
import {
  canPostPayment,
  findBlockedLinks,
  findHeldBalanceCents,
  findPayableAccountId,
  isPaymentSettled,
  storedStatusForPeriod,
} from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingFormUtils";
import { buildPaymentPreview } from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingPreviewUtils";
import { salesTaxPostingSelect } from "@/app/salesTax/salesTaxPosting/salesTaxPostingSelect";
import { useSalesTaxPosting } from "@/app/salesTax/salesTaxPosting/useSalesTaxPosting";
import { can } from "@/permission/can";

/**
 * The body of the Post Sales Tax Payment dialog. It mounts when the dialog opens, so its loads run
 * then and its state is cleared when the dialog closes. The server re-reads the balance and
 * re-checks everything; this only shows what to expect and what happened.
 */
export function PostSalesTaxPaymentForm({
  periodEnd,
  returnFileText,
}: {
  periodEnd: string;
  returnFileText: string;
}) {
  useDepositFieldMapping({ autoLoad: true });
  useQboAccount({ autoLoad: true });
  const { postPayment, retryAttachments } = useSalesTaxPosting({ periodEnd });

  const allows = useSelector(userCapabilitiesSelect.allows);
  const taxReport = useSelector(salesTaxUISelect.taxReport);
  const salesTaxLinks = useSelector(depositFieldMappingSelect.salesTaxLinks);
  const accountBalances = useSelector(qboBalanceSheetSelect.accountBalances);
  const paymentStatus = useSelector(salesTaxPostingSelect.paymentStatus);
  const postStatus = useSelector(salesTaxPostingSelect.postStatus);

  const [amountText, setAmountText] = useState("");

  const blockedLinks = findBlockedLinks(salesTaxLinks);
  const payableAccountId = findPayableAccountId(salesTaxLinks);
  // Reads the balance when the payable link resolves. The held figure is dropped while a fresh
  // read is in flight, so the dialog never shows or acts on an old number.
  const { refreshBalance } = useQboBalanceSheet({ accountId: payableAccountId, asOfDate: periodEnd });
  const balanceCents = findHeldBalanceCents({
    balances: accountBalances,
    accountId: payableAccountId,
    asOfDate: periodEnd,
  });

  const stored = storedStatusForPeriod({ paymentStatus, periodEnd });
  const preview = buildPaymentPreview({
    amountText,
    balanceCents,
    adjustmentAlreadyPosted: stored?.adjustment?.status === "posted",
    warnCents: qboConst.salesTaxAdjustmentWarnCents,
  });
  const canWrite = allows(can.qboJournalEntries.write);
  const canPost = canPostPayment({
    canWrite,
    hasTaxReport: taxReport !== null,
    amountIsUsable: preview.canPost,
    paymentIsSettled: isPaymentSettled(stored?.payment),
    hasBlockedLinks: blockedLinks.length > 0,
    isPosting: postStatus === "pending",
  });

  const handlePost = async () => {
    if (!taxReport || preview.paymentCents === null || balanceCents === null) return;
    await postPayment({
      periodEnd,
      paymentCents: preview.paymentCents,
      expectedBalanceCents: balanceCents,
      returnFileText,
      taxCodeReportCsv: buildTaxCodeReportCsv(taxReport),
    });
    // The balance now includes whatever posted, so the next attempt must be checked against it.
    refreshBalance();
  };

  return (
    <div className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Post Sales Tax Payment</DialogTitle>
        <DialogDescription>
          Records the payment you made to the state in QuickBooks, dated today, with the return file
          and the RealGreen tax code report attached.
        </DialogDescription>
      </DialogHeader>

      {blockedLinks.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>The payment accounts are not linked</AlertTitle>
          <AlertDescription>
            Link {blockedLinks.map((link) => DEPOSIT_LINK_LABELS[link.field]).join(", ")} on the{" "}
            <Link href="/account/mapping" className="font-semibold underline">
              account mapping page
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <PostSalesTaxPaymentSummary
        periodEnd={periodEnd}
        returnFileText={returnFileText}
        balanceCents={balanceCents}
      />
      <PaymentAmountField
        amountText={amountText}
        onChangeAction={setAmountText}
        preview={preview}
        periodEnd={periodEnd}
      />
      <PostResultNotices />
      <SalesTaxPaymentStatusPanel
        periodEnd={periodEnd}
        canRetry={canWrite}
        onRetryAction={retryAttachments}
      />

      <DialogFooter className="gap-2">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Close
          </Button>
        </DialogClose>
        <Button type="button" disabled={!canPost} onClick={handlePost}>
          Post to QuickBooks
        </Button>
      </DialogFooter>
      {!canWrite && (
        <p className="text-xs text-muted-foreground">
          You do not have permission to post journal entries to QuickBooks.
        </p>
      )}
    </div>
  );
}
