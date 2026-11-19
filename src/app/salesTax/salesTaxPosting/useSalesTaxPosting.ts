import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { salesTaxPostingActions } from "@/app/salesTax/salesTaxPosting/salesTaxPostingSlice";

/**
 * Loads the stored record of a month's payment when the hook mounts, clears the last run's answer
 * when it unmounts, and exposes actions only. Posting writes to the real books, so nothing is
 * posted until the user acts. The status read is forced, so reopening the dialog never shows a
 * stale record.
 */
export function useSalesTaxPosting({ periodEnd }: { periodEnd: string }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      salesTaxPostingActions.getSalesTaxPaymentStatus({
        params: { periodEnd },
        config: { loadingMsg: "Loading the payment record...", force: true, showLoading: false },
      }),
    );
  }, [periodEnd, dispatch]);

  // The next dialog must never open on the last run's problems or warnings.
  useEffect(
    () => () => {
      dispatch(salesTaxPostingActions.resetPostingState());
    },
    [dispatch],
  );

  const postPayment = (params: {
    periodEnd: string;
    paymentCents: number;
    expectedBalanceCents: number;
    returnFileText: string;
    taxCodeReportCsv: string;
  }) =>
    dispatch(
      salesTaxPostingActions.postSalesTaxPayment({
        params,
        config: { loadingMsg: "Posting the sales tax payment to QuickBooks..." },
      }),
    );

  const retryAttachments = () =>
    dispatch(
      salesTaxPostingActions.retrySalesTaxAttachments({
        params: { periodEnd },
        config: { loadingMsg: "Attaching the files in QuickBooks..." },
      }),
    );

  return { postPayment, retryAttachments };
}
