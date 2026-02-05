import { AppDispatch } from "@/store";
import { useDispatch } from "react-redux";
import { discountActions } from "@/app/realGreen/discount/discountSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";

export function useDiscount({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();

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
