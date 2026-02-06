import { discountActions } from "@/app/realGreen/discount/discountSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";

export function useDiscount({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        discountActions.getDiscountDocs({
          params: {},
          config: {
            loadingMsg: "Loading discounts...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      discountActions.getDiscountDocs({
        params: {},
        config: {
          loadingMsg: "Loading discounts...",
          force: true,
        },
      }),
    );

  return { refresh };
}
