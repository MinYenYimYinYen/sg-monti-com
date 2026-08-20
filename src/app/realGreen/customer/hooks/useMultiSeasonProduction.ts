import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { multiSeasonProductionGetDocs } from "@/app/realGreen/customer/slices/customerSlices";

export function useMultiSeasonProduction() {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);

  const load = () => {
    if (!season) return;
    dispatch(
      multiSeasonProductionGetDocs({
        params: {
          schemeName: "multiSeasonProduction",
          season,
        },
        config: {
          loadingMsg: "Loading multi-season production data...",
        },
      }),
    );
  };

  return { load, canLoad: !!season };
}
