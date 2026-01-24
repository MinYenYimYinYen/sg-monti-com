import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { priceTableActions } from "@/app/realGreen/priceTable/priceTableSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function usePriceTable({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();

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
