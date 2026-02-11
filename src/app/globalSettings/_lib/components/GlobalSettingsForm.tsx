"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/style/components/card";
import { Label } from "@/style/components/label";
import { Input } from "@/style/components/input";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";

type GlobalSettingsFormProps = {
  season: number | undefined;
};

export function GlobalSettingsForm({ season }: GlobalSettingsFormProps) {
  const { updateSettings, canUpdateSettings } = useGlobalSettings({
    autoLoad: true,
  });
  const [localSeason, setLocalSeason] = useState<string>(
    season?.toString() || "",
  );
  const [status, setStatus] = useState<SaveStatus>("idle");

  const handleSeasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSeason(e.target.value);
    if (status !== "idle") setStatus("idle");
  };

  const handleSave = async () => {
    const newSeason = parseInt(localSeason, 10);
    if (isNaN(newSeason)) return;

    setStatus("saving");
    try {
      await updateSettings({ season: newSeason });
      setStatus("success");
    } catch (e) {
      console.error("Failed to save settings", e);
      setStatus("idle");
    }
  };

  const hasChanges = season !== undefined && localSeason !== season.toString();

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-8">
            <CardTitle>Global Settings</CardTitle>
            <SaveButton
              onClick={handleSave}
              status={status}
              disabled={!canUpdateSettings || !hasChanges}
              variant="primary"
              intensity="solid"
            >
              Save
            </SaveButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="season">Current Season</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                id="season"
                value={localSeason}
                onChange={handleSeasonChange}
                disabled={!canUpdateSettings}
                className="w-32"
              />
            </div>
            {!canUpdateSettings && (
              <span className="text-sm text-muted-foreground">
                Loading settings...
              </span>
            )}
            <p className="text-sm text-muted-foreground">
              Changing the season will update all customer searches.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
