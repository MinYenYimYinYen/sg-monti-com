import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { qboBalanceSheetActions } from "@/app/qbo/balanceSheet/qboBalanceSheetSlice";

/**
 * Reads one account's balance as of a day when `accountId` is set, and exposes actions only. The
 * read is forced because a balance changes with every posting, so a cached figure must never be
 * shown as current. Pass a null `accountId` to read nothing yet (for example while the account
 * link is still loading).
 */
export function useQboBalanceSheet({
  accountId,
  asOfDate,
}: {
  accountId: string | null;
  asOfDate: string;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!accountId) return;
    dispatch(
      qboBalanceSheetActions.getQboAccountBalance({
        params: { accountId, asOfDate },
        config: { loadingMsg: "Reading the balance from QuickBooks...", force: true },
      }),
    );
  }, [accountId, asOfDate, dispatch]);

  const refreshBalance = () => {
    if (!accountId) return;
    dispatch(
      qboBalanceSheetActions.getQboAccountBalance({
        params: { accountId, asOfDate },
        config: { loadingMsg: "Reading the balance from QuickBooks...", force: true },
      }),
    );
  };

  return { refreshBalance };
}
