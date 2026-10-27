"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { Button } from "@/style/components/button";
import { Label } from "@/style/components/label";
import { Checkbox } from "@/style/components/checkbox";
import { ScrollArea } from "@/style/components/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";
import { ChevronDown } from "lucide-react";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { globalSettingsActions } from "@/app/globalSettings/_lib/globalSettingsSlice";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { FlagPicker } from "@/app/priceIncrease/config/_components/FlagPicker";

export function FlagMappingsSection() {
  const dispatch = useAppDispatch();
  const draft = useSelector(priceIncreaseConfigSelect.flagMappingsDraft);
  const isValid = useSelector(priceIncreaseConfigSelect.flagMappingsIsValid);
  const isDirty = useSelector(priceIncreaseConfigSelect.flagMappingsIsDirty);
  const currentSettings = useSelector(globalSettingsSelect.settings);
  const flagDocs = useSelector(flagSelect.flagDocs);
  const exemptFlagIds = useSelector(globalSettingsSelect.priceIncreaseExemptFlagIds);
  const sortedFlagDocs = [...flagDocs].sort((a, b) => a.desc.localeCompare(b.desc));
  const manualFlagId = useSelector(globalSettingsSelect.priceIncreaseManualFlagId);

  const handleSave = () => {
    if (!currentSettings) return;

    // Optimistic update — mirrors useGlobalSettings pattern so dirty check clears immediately
    dispatch(globalSettingsActions.setSettings({ ...currentSettings, increaseFlagMappings: draft }));

    dispatch(
      globalSettingsActions.updateSettings({
        params: { increaseFlagMappings: draft },
        config: { loadingMsg: "Saving flag mappings..." },
      }),
    );
  };

  const handleExemptToggle = (flagId: number) => {
    if (!currentSettings) return;
    const nextFlagIds = exemptFlagIds.includes(flagId)
      ? exemptFlagIds.filter((id) => id !== flagId)
      : [...exemptFlagIds, flagId];
    dispatch(globalSettingsActions.setSettings({ ...currentSettings, priceIncreaseExemptFlagIds: nextFlagIds }));
    dispatch(
      globalSettingsActions.updateSettings({
        params: { priceIncreaseExemptFlagIds: nextFlagIds },
        config: { showLoading: false },
      }),
    );
  };

  const handleManualChange = (value: string) => {
    if (!currentSettings) return;
    const flagId = value === "" ? null : parseInt(value);
    dispatch(globalSettingsActions.setSettings({ ...currentSettings, priceIncreaseManualFlagId: flagId }));
    dispatch(
      globalSettingsActions.updateSettings({
        params: { priceIncreaseManualFlagId: flagId },
        config: { showLoading: false },
      }),
    );
  };

  const saveVariant = isDirty && isValid ? "destructive" : "primary";

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Increase Flag Mappings</h2>
        <Button
          size="sm"
          variant={saveVariant}
          intensity="solid"
          onClick={handleSave}
          disabled={!isValid || !isDirty}
        >
          Save Changes
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Map RealGreen flags to increase percentages. Each flag must have a unique, non-zero value.
        Values are integers — enter 5 for 5%.
      </p>

      <FlagPicker />

      {draft.length > 0 && !isValid && (
        <p className="text-xs text-destructive mt-2">
          All flags must have a non-zero value and no two flags may share the same percentage.
        </p>
      )}

      {/* Exempt and Manual flag selectors — sourced from all available flags */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Exempt Flags</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" intensity="ghost" className="w-full justify-between font-normal">
                <span className="truncate">
                  {exemptFlagIds.length === 0
                    ? "— None —"
                    : `${exemptFlagIds.length} flag${exemptFlagIds.length === 1 ? "" : "s"} selected`}
                </span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <div className="h-48">
                <ScrollArea className="h-full">
                  <div className="space-y-2 p-1 pr-3">
                    {sortedFlagDocs.map((flag) => (
                      <div key={flag.flagId} className="flex items-center gap-2">
                        <Checkbox
                          id={`exempt-flag-${flag.flagId}`}
                          checked={exemptFlagIds.includes(flag.flagId)}
                          onCheckedChange={() => handleExemptToggle(flag.flagId)}
                        />
                        <Label
                          htmlFor={`exempt-flag-${flag.flagId}`}
                          className="cursor-pointer font-normal text-sm"
                        >
                          {flag.desc}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">Customers with any of these flags are exempt from price increase.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-flag">Manual Flag</Label>
          <select
            id="manual-flag"
            value={manualFlagId ?? ""}
            onChange={(e) => handleManualChange(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">— None —</option>
            {flagDocs.map((f) => (
              <option key={f.flagId} value={f.flagId}>
                {f.desc}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Customers with this flag have a manually set price increase.</p>
        </div>
      </div>
    </section>
  );
}
