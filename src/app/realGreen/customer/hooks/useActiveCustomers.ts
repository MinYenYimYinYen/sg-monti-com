import { useSelector } from "react-redux";
import { useEffect } from "react";
import { activeCustomersActions } from "@/app/realGreen/customer/slices/activeCustomersSlice";
import { useAppDispatch } from "@/lib/hooks/redux";
import { centralCustomerActions } from "@/app/realGreen/customer/slices/centralCustomerSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";

export function useActiveCustomers() {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const context = useSelector(centralSelect.context);
  const season = useSelector(globalSettingsSelect.season);

  useEffect(() => {
    if (context === "active") return;
    dispatch(centralCustomerActions.setCustomerContext("active"));
  }, [context, dispatch]);

  useEffect(() => {
    if (!season) return;
    dispatch(
      activeCustomersActions.getCustDocs({
        params: {
          schemeName: "activeCustomers",
          season,
        },
        config: {
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [dispatch, season]);

  const refresh = () => {
    if (!season) return;
    dispatch(
      activeCustomersActions.getCustDocs({
        params: {
          schemeName: "activeCustomers",
          season,
        },
        config: {
          force: true,
        },
      }),
    );
  };

  const canRefresh = !!season;

  return { refresh, canRefresh };
}
