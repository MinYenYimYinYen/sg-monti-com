import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { globalSettingsActions } from "@/app/globalSettings/_lib/globalSettingsSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useSelector } from "react-redux";
import { GlobalSettings } from "@/app/globalSettings/_lib/GlobalSettingsTypes";

export function useGlobalSettings({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();
  const currentSettings = useSelector(globalSettingsSelect.settings);

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        globalSettingsActions.getSettings({
          params: {},
          config: {
            staleTime: realGreenConst.paramTypesCacheTime,
            showLoading: false,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () => {
    dispatch(
      globalSettingsActions.getSettings({
        params: {},
        config: {
          force: true,
          showLoading: false,
        },
      }),
    );
  };

  const updateSettings = (newSettings: Partial<GlobalSettings>) => {
    if (!currentSettings) {
      return Promise.reject(new Error("Settings not loaded"));
    }
    
    // Optimistic update
    dispatch(
      globalSettingsActions.setSettings({
        ...currentSettings,
        ...newSettings,
      }),
    );

    // Return the promise for the API call
    return dispatch(
      globalSettingsActions.updateSettings({
        params: newSettings,
        config: {
          showLoading: false,
        },
      }),
    ).unwrap();
  };

  const canUpdateSettings = !!currentSettings;

  return { refresh, updateSettings, canUpdateSettings };
}
