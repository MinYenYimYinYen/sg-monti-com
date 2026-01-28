import { AppDispatch } from "@/store";
import { useDispatch } from "react-redux";
import { discountActions } from "@/app/realGreen/discount/discountSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function useDiscount({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();

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
