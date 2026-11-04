import { useAppDispatch } from "@/lib/hooks/redux";
import { qboPurchaseActions } from "@/app/qbo/purchase/qboPurchaseSlice";
import { QboPurchaseRange } from "@/app/qbo/purchase/types/QboPurchaseTypes";

/**
 * Exposes actions only. There is no autoLoad: a purchase load needs a date range chosen by
 * the user, so nothing is fetched until loadRange is called.
 */
export function useQboPurchase() {
  const dispatch = useAppDispatch();

  const loadRange = ({ startDate, endDate }: QboPurchaseRange) =>
    dispatch(
      qboPurchaseActions.getQboPurchases({
        params: { startDate, endDate },
        config: { loadingMsg: "Loading QuickBooks purchases..." },
      }),
    );

  return { loadRange };
}
