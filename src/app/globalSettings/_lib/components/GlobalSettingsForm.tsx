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

export function GlobalSettingsForm() {
  const {
    updateSettings,
    canUpdate,
    localSeason,
    setLocalSeason,
    localSettings,
  } = useGlobalSettings({
    autoLoad: true,
  });
  const [status, setStatus] = useState<SaveStatus>("idle");

  const handleSeasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      setLocalSeason(parsed);
    }
    if (status !== "idle") setStatus("idle");
  };

  const handleSave = async () => {
    if (!localSettings) return;

    setStatus("saving");
    try {
      await updateSettings(localSettings);
      setStatus("success");
    } catch (e) {
      console.error("Failed to save settings", e);
      setStatus("idle");
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-8">
            <CardTitle>Global Settings</CardTitle>
            <SaveButton
              onClick={handleSave}
              status={status}
              disabled={!canUpdate}
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
                value={localSeason ?? ""}
                onChange={handleSeasonChange}
                disabled={localSeason === undefined}
                className="w-32"
              />
            </div>
            {localSeason === undefined && (
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
