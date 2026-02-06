import { priceTableActions } from "@/app/realGreen/priceTable/priceTableSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";

export function usePriceTable({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
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
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      priceTableActions.getPriceTableDocs({
        params: {},
        config: {
          loadingMsg: "Loading price tables...",
          force: true,
        },
      }),
    );

  return { refresh };
}
