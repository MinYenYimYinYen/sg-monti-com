import { useAppDispatch } from "@/lib/hooks/redux";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { singleCustomerActions } from "@/app/realGreen/customer/slices/customerSlices";

export function useSingleCustomer() {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const { season } = useSelector(globalSettingsSelect.settings);
  const lookup = (custId: number) => {
    console.log("season", season);
    if (!season) return;
    if (!custId || custId < 0) return;
    dispatch(
      singleCustomerActions.getDocs({
        params: {
          schemeName: "singleCustomer",
          season,
          schemeParams: { custId },
        },
        config: { showLoading: false, force: true },
      }),
    );
  };

  return { lookup };
}
