import { priceTableActions } from "@/app/realGreen/priceTable/priceTableSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers that do not gate can omit it.
 */
export function usePriceTable({
  autoLoad,
  canLoad = true,
}: {
  autoLoad: boolean;
  canLoad?: boolean;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        priceTableActions.getPriceTableDocs({
          params: {},
          config: {
            loadingMsg: "Loading price tables...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  const refresh = () => {
    if (!canLoad) return;
    dispatch(
      priceTableActions.getPriceTableDocs({
        params: {},
        config: {
          loadingMsg: "Loading price tables...",
          force: true,
        },
      }),
    );
  };

  return { refresh };
}
