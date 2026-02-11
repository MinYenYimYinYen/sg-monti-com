"use client";

import React from "react";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { GlobalSettingsForm } from "@/app/globalSettings/_lib/components/GlobalSettingsForm";

export default function GlobalSettingsPage() {
  const serverSeason = useSelector(globalSettingsSelect.season);

  return (
    <GlobalSettingsForm
      key={serverSeason} // Forces re-mount (and state reset) when season loads/changes
      season={serverSeason}
    />
  );
}
