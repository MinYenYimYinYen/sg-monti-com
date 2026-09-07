"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { priceIncreaseConfigActions } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { SettingsSection } from "@/app/priceIncrease/config/_components/SettingsSection";
import { FlagMappingsSection } from "@/app/priceIncrease/config/_components/FlagMappingsSection";

export function ConfigPanel() {
  const dispatch = useAppDispatch();
  const storedMappings = useSelector(globalSettingsSelect.increaseFlagMappings);

  // Seed the flag mappings draft from stored GlobalSettings on mount
  useEffect(() => {
    dispatch(priceIncreaseConfigActions.setFlagMappingsDraft(storedMappings));
  }, [dispatch, storedMappings]);

  return (
    <div className="overflow-y-auto h-full p-4 space-y-6">
      <SettingsSection />
      <FlagMappingsSection />
    </div>
  );
}
