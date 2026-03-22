import { useSelector } from "react-redux";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { activeCustomersGetDocs } from "@/app/realGreen/customer/slices/customerReducers";

export function useActiveCustomers({ autoLoad = false }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);

  useEffect(() => {
    if (!autoLoad || !season) return;
    dispatch(
      activeCustomersGetDocs({
        params: {
          schemeName: "activeCustomers",
          season,
        },
        config: {
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [autoLoad, dispatch, season]);

  const refresh = () => {
    if (!season) return;
    dispatch(
      activeCustomersGetDocs({
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

  return { refresh, canRefresh: !!season };
}
