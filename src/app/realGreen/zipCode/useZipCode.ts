import { zipCodeActions } from "@/app/realGreen/zipCode/zipCodeSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useTaxCode } from "@/app/realGreen/taxCode/useTaxCode";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. Each
 * flag defaults to allowed so callers that do not gate can omit it. The tax codes have their own
 * flag because a zip code's tax rate comes from the tax code read, a different capability.
 */
export function useZipCode({
  autoLoad,
  canLoad = true,
  canLoadTaxCodes = true,
}: {
  autoLoad: boolean;
  canLoad?: boolean;
  canLoadTaxCodes?: boolean;
}) {
  useTaxCode({ autoLoad, canLoad: canLoadTaxCodes });
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        zipCodeActions.getZipCodes({
          params: {},
          config: {
            loadingMsg: "Loading zip codes...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  const refresh = () => {
    if (!canLoad) return;
    dispatch(
      zipCodeActions.getZipCodes({
        params: {},
        config: {
          showLoading: true,
          force: true,
        },
      }),
    );
  };

  return { refresh };
}
