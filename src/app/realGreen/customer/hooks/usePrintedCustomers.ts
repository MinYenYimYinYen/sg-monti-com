import { printedCustomersActions } from "@/app/realGreen/customer/slices/printedCustomersSlice";
import { realGreenConst } from "../../_lib/realGreenConst";
import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { centralCustomerActions } from "@/app/realGreen/customer/slices/centralCustomerSlice";
import { useSelector } from "react-redux";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";

export function usePrintedCustomers({ autoLoad }: { autoLoad?: boolean }) {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const context = useSelector(centralSelect.context);
  const season = useSelector(globalSettingsSelect.season);

  useEffect(() => {
    if (context === "printed") return;
    dispatch(centralCustomerActions.setCustomerContext("printed"));
  }, [dispatch, context]);

  useEffect(() => {
    if (!season) return;
    if (autoLoad) {
      dispatch(
        printedCustomersActions.getCustDocs({
          params: {
            schemeName: "printedCustomers",
            season,
          },
          config: { staleTime: realGreenConst.paramTypesCacheTime },
        }),
      );
    }
  }, [autoLoad, dispatch, season]);

  const refresh = useCallback(() => {
    if (!season) return;
    dispatch(
      printedCustomersActions.getCustDocs({
        params: {
          schemeName: "printedCustomers",
          season,
        },
        config: { staleTime: realGreenConst.paramTypesCacheTime, force: true },
      }),
    );
  }, [dispatch, season]);

  const canRefresh = !!season;

  return { refresh, canRefresh };
}
