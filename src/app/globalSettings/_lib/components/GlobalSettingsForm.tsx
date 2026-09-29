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
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { globalSettingsActions } from "@/app/globalSettings/_lib/globalSettingsSlice";
import type { RenewalFlagIds } from "@/app/globalSettings/_lib/GlobalSettingsTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";

// ─── Renewal Flags Section ────────────────────────────────────────────────────

const RENEWAL_FLAG_FIELDS: { key: keyof RenewalFlagIds; label: string; description: string }[] = [
  { key: "autoRenew", label: "Auto Renew", description: "Customers flagged as auto-renewing" },
  { key: "dontAutoRenew", label: "Don't Auto Renew", description: "Customers flagged as not auto-renewing" },
  { key: "confirmed", label: "Confirmed", description: "Customers who have confirmed their renewal decision" },
];

const NONE_VALUE = "none";

function RenewalFlagsSection() {
  const dispatch = useAppDispatch();
  const flagDocs = useSelector(flagSelect.flagDocs);
  const renewalFlagIds = useSelector(globalSettingsSelect.renewalFlagIds);
  const currentSettings = useSelector(globalSettingsSelect.settings);

  const sortedFlagDocs = [...flagDocs].sort((a, b) => a.desc.localeCompare(b.desc));

  function handleChange(key: keyof RenewalFlagIds, value: string) {
    if (!currentSettings) return;
    const newId = value === NONE_VALUE ? null : Number(value);
    const updatedRenewalFlagIds: RenewalFlagIds = { ...renewalFlagIds, [key]: newId };

    dispatch(
      globalSettingsActions.setSettings({
        ...currentSettings,
        renewalFlagIds: updatedRenewalFlagIds,
      }),
    );

    dispatch(
      globalSettingsActions.updateSettings({
        params: { renewalFlagIds: updatedRenewalFlagIds },
        config: { showLoading: false },
      }),
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Renewal Flags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          These flags identify customer renewal intent and drive customer filtering in prepay letter
          generation and other modules. Changes take effect immediately.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {RENEWAL_FLAG_FIELDS.map(({ key, label, description }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-sm">{label}</Label>
              <Select
                value={renewalFlagIds[key]?.toString() ?? NONE_VALUE}
                onValueChange={(value) => handleChange(key, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>
                    <span className="text-muted-foreground italic">None</span>
                  </SelectItem>
                  {sortedFlagDocs.map((flag) => (
                    <SelectItem key={flag.flagId} value={flag.flagId.toString()}>
                      {flag.desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

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
    <div className="p-6 space-y-4">
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

      <RenewalFlagsSection />
    </div>
  );
}
