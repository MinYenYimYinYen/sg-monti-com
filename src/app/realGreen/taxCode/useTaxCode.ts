import { taxCodeActions } from "@/app/realGreen/taxCode/taxCodeSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";

export function useTaxCode({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        taxCodeActions.getTaxCodes({
          params: {},
          config: {
            loadingMsg: "Loading tax codes...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      taxCodeActions.getTaxCodes({
        params: {},
        config: {
          loadingMsg: "Loading tax codes...",
          force: true,
        },
      }),
    );

  return { refresh };
}
