"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { sanitySelect } from "@/app/sanity/sanitySelect";
import { sanityActions } from "@/app/sanity/sanitySlice";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { RefreshCw } from "lucide-react";

type SanityLoadControlsProps = {
  onLoad: () => void;
};

export function SanityLoadControls({ onLoad }: SanityLoadControlsProps) {
  const dispatch = useAppDispatch();
  const globalSeason = useSelector(globalSettingsSelect.season);
  const seasonOverride = useSelector(sanitySelect.seasonOverride);

  // Display the override if set, otherwise fall back to the global season
  const displaySeason = seasonOverride ?? globalSeason ?? "";

  const handleSeasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed)) {
      dispatch(sanityActions.setSeasonOverride(parsed));
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="sanity-season" className="text-sm shrink-0">
          Season
        </Label>
        <Input
          id="sanity-season"
          type="number"
          value={displaySeason}
          onChange={handleSeasonChange}
          className="w-24 h-8 text-sm"
          disabled={globalSeason === undefined}
        />
      </div>
      <Button variant="primary" intensity="solid" size="sm" onClick={onLoad} className="gap-1.5">
        <RefreshCw className="h-4 w-4" />
        Load
      </Button>
    </div>
  );
}
