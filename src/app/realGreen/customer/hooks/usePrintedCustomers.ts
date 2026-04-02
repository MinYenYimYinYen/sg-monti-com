import { realGreenConst } from "../../_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { printedCustomersGetDocs } from "@/app/realGreen/customer/slices/customerSlices";

export function usePrintedCustomers({
  autoLoad = false,
}: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);

  useEffect(() => {
    if (!autoLoad || !season) {
      return;
    }
    dispatch(
      printedCustomersGetDocs({
        params: {
          schemeName: "printedCustomers",
          season,
        },
        config: { staleTime: realGreenConst.paramTypesCacheTime },
      }),
    );
  }, [autoLoad, dispatch, season]);

  const refresh = () => {
    if (!season) return;
    dispatch(
      printedCustomersGetDocs({
        params: {
          schemeName: "printedCustomers",
          season,
        },
        config: { staleTime: realGreenConst.paramTypesCacheTime, force: true },
      }),
    );
  };

  return { refresh, canRefresh: !!season };
}
