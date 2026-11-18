import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { salesTaxMappingActions } from "@/app/salesTax/salesTaxMapping/salesTaxMappingSlice";
import { MnTaxType } from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. The
 * layout loads with `autoLoad`; a child that only saves passes `autoLoad: false`.
 */
export function useSalesTaxMapping({
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
        salesTaxMappingActions.getAllSalesTaxMappings({
          params: {},
          config: {
            loadingMsg: "Loading sales tax mappings...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  /** Saving no tax types at all means the tax code is unmapped, so the stored mapping is removed. */
  const saveMapping = ({
    taxCodeId,
    mnTaxTypes,
  }: {
    taxCodeId: string;
    mnTaxTypes: MnTaxType[];
  }) => {
    if (mnTaxTypes.length === 0) {
      dispatch(
        salesTaxMappingActions.removeSalesTaxMapping({
          params: { taxCodeId },
          config: { loadingMsg: "Removing mapping...", successMsg: "Mapping removed" },
        }),
      );
      return;
    }
    dispatch(
      salesTaxMappingActions.upsertSalesTaxMapping({
        params: { taxCodeId, mnTaxTypes },
        config: { loadingMsg: "Saving mapping...", successMsg: "Mapping saved" },
      }),
    );
  };

  return { saveMapping };
}
