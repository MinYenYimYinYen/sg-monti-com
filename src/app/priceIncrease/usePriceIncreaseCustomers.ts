import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import {
  priceIncreaseCustomersGetDocs,
  priceIncreaseCustomersRefresh,
  priceIncreaseCustomersActions,
  PIPELINE,
} from "@/app/realGreen/customer/slices/customerSlices";
import { centralCustomerActions } from "@/app/realGreen/customer/slices/centralCustomerSlice";
import { buildActiveCustomersPlan } from "@/app/realGreen/customer/hooks/buildActiveCustomersPlan";

/**
 * Loads the "active customers" dataset for `seasonSource` into the dedicated
 * priceIncrease customer slice (never the shared `active` slice).
 *
 * A change of seasonSource always forces a reload: the slice is cleared on every
 * fetch, so a cached hash from an earlier season must not suppress it.
 */
export function usePriceIncreaseCustomers({ autoLoad = false }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const seasonSource = useSelector(priceIncreaseConfigSelect.seasonSource);
  const seasonsRestored = useSelector(priceIncreaseConfigSelect.seasonsRestored);
  const lastRequestedSeason = useRef<number | null>(null);
  const [refreshingCustIds, setRefreshingCustIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!autoLoad || !seasonsRestored || !seasonSource) return;

    const sourceChanged =
      lastRequestedSeason.current !== null && lastRequestedSeason.current !== seasonSource;
    lastRequestedSeason.current = seasonSource;

    // The slice clears itself on every fetch, but the central maps (what results
    // actually read) are additive and never clear on a refetch. Without this, the
    // previous season's docs would linger alongside the new season's.
    if (sourceChanged) dispatch(centralCustomerActions.clearAllMaps());

    const config = { staleTime: realGreenConst.paramTypesCacheTime, force: sourceChanged };
    const params =
      PIPELINE.priceIncrease === "mirror"
        ? { plan: buildActiveCustomersPlan(seasonSource) }
        : { schemeName: "activeCustomers", season: seasonSource };
    (dispatch as any)(priceIncreaseCustomersGetDocs({ params: params as any, config: config as any }));
  }, [autoLoad, dispatch, seasonSource, seasonsRestored]);

  const refreshCustomer = async (custId: number) => {
    if (!seasonSource || !custId || custId < 0 || refreshingCustIds.has(custId)) return;
    setRefreshingCustIds((prev) => new Set(prev).add(custId));
    try {
      const result = await dispatch(
        priceIncreaseCustomersRefresh({
          params: { schemeName: "activeCustomers", season: seasonSource, custId },
          config: { showLoading: false },
        }),
      );
      if (priceIncreaseCustomersRefresh.fulfilled.match(result)) {
        if (result.payload.customerDocs.length === 0) {
          dispatch(priceIncreaseCustomersActions.removeCustomer(custId));
        } else {
          dispatch(priceIncreaseCustomersActions.replaceCustomer(result.payload));
        }
      }
    } finally {
      setRefreshingCustIds((prev) => {
        const next = new Set(prev);
        next.delete(custId);
        return next;
      });
    }
  };

  const isRefreshingCustomer = (custId: number) => refreshingCustIds.has(custId);

  return { refreshCustomer, isRefreshingCustomer };
}
