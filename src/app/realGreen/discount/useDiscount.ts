import { discountActions } from "@/app/realGreen/discount/discountSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers that do not gate can omit it.
 */
export function useDiscount({
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
        discountActions.getDiscountDocs({
          params: {},
          config: {
            loadingMsg: "Loading discounts...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  const refresh = () => {
    if (!canLoad) return;
    dispatch(
      discountActions.getDiscountDocs({
        params: {},
        config: {
          loadingMsg: "Loading discounts...",
          force: true,
        },
      }),
    );
  };

  return { refresh };
}
