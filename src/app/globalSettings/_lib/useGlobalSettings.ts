import { useAppDispatch } from "@/lib/hooks/redux";
import React, { useEffect, useMemo, useState } from "react";
import { globalSettingsActions } from "@/app/globalSettings/_lib/globalSettingsSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useSelector } from "react-redux";
import { GlobalSettings } from "@/app/globalSettings/_lib/GlobalSettingsTypes";
import { deepEqual } from "@/lib/primatives/typeUtils/deepEqual";
import { CoverSheetsConfig } from "@/app/scheduling/coverSheets/_lib/config/CoverSheetsTypes";
import { baseCoverSheetsConfig } from "@/app/scheduling/coverSheets/_lib/config/CoverSheetsTypes";

export function useGlobalSettings({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();
  const currentSettings = useSelector(globalSettingsSelect.settings);

  // Individual local states for each GlobalSettings key
  const [localSeason, setLocalSeason] = useState<number | undefined>(
    currentSettings?.season,
  );
  const [localCoverSheetsConfig, setLocalCoverSheetsConfig] =
    useState<CoverSheetsConfig>(baseCoverSheetsConfig);

  // Sync local states when currentSettings changes
  React.useEffect(() => {
    if (currentSettings) {
      setLocalSeason(currentSettings.season);
      setLocalCoverSheetsConfig(currentSettings.coverSheetsConfig);
    }
  }, [currentSettings]);

  // Computed localSettings from individual local states
  const localSettings: Partial<GlobalSettings> | undefined = useMemo(() => {
    return localSeason !== undefined
      ? {
          season: localSeason,
          coverSheetsConfig: localCoverSheetsConfig,
        }
      : undefined;
  }, [localCoverSheetsConfig, localSeason]);

  // Setter for all local settings at once
  const setLocalSettings = (newSettings: Partial<GlobalSettings>) => {
    if (newSettings.season !== undefined) {
      setLocalSeason(newSettings.season);
    }
    if (newSettings.coverSheetsConfig !== undefined) {
      setLocalCoverSheetsConfig(newSettings.coverSheetsConfig);
    }
  };
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

  // Compare currentSettings to localSettings
  const canUpdate = useMemo(() => {
    if (!currentSettings || !localSettings) return false;

    return !deepEqual(currentSettings, localSettings);
  }, [currentSettings, localSettings]);

  const cancelChanges = () => {
    if (!currentSettings) return;
    setLocalSeason(currentSettings?.season);
    setLocalCoverSheetsConfig(currentSettings?.coverSheetsConfig);
    setLocalSettings(currentSettings);
  }

  return {
    refresh,
    updateSettings,
    canUpdate,
    cancelChanges,
    localSeason,
    setLocalSeason,
    localCoverSheetsConfig,
    setLocalCoverSheetsConfig,
    localSettings,
    setLocalSettings,
  };
}
